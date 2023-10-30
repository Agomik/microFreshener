import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap, map, catchError } from 'rxjs/operators';

import { GraphService } from '../graph/graph.service';

import { Principle } from '../graph/model/principles';
import { Smell } from '../graph/model/smell';

import { CommunicationPattern } from "../graph/model/communicationpattern";
import { SmellFactoryService } from './smell-factory.service';
import { Analysed } from './analysed';
import { GroupSmellObject, SmellObject } from './smells/smell';
import * as _ from 'lodash';


@Injectable({
  providedIn: 'root'
})

export class AnalyserService {


  private analysisUrl = environment.serverUrl + '/api/analyse';
  
  nodesWithSmells: Analysed<joint.shapes.microtosca.Node>[] = [];   // list of analysed nodes in analysis response
  groupsWithSmells: Analysed<joint.shapes.microtosca.Group>[] = []; // list of analysed groups in analysis response

  constructor(
    private http: HttpClient,
    private gs: GraphService,
    private smellFactory: SmellFactoryService
  ) { }

  getSmellsCount(){
    var num_smells = 0;
    this.nodesWithSmells.forEach((anode)=> {
      num_smells +=  anode.getSmells().length;
    });
    this.groupsWithSmells.forEach((agroup)=> {
      num_smells +=  agroup.getSmells().length;
    });

    return num_smells
  }
  
  showSmells() {
    this.showNodeSmells();
    this.showGroupSmells();
  }

  private showNodeSmells() {
    this.nodesWithSmells.forEach((anode) => {
      let n = this.gs.getGraph().getNode(anode.getName());
      anode.getSmells().forEach((smell) => {
        n.addSmell(smell);
      })
    })
  }

  private showGroupSmells() {
    this.groupsWithSmells.forEach((agroup) => {
      let g = this.gs.getGraph().getGroup(agroup.getName());
      console.debug("showGroupSmells, smells are", g.getSmells())
      agroup.getSmells().forEach((smell) => {
          g.addSmell(smell);
      })
    })
  }

  // Remove the "smells" icons in the nodes and groups
  clearSmells() {
    this.gs.getGraph().getNodes().forEach(node => {
      node.resetSmells();
    });
    this.gs.getGraph().getGroups().forEach(group => {
      group.resetSmells();
    });
  }

  getPrinciplesToAnalyse() {
    return this.http.get<any>('assets/data/principles.json')
      .toPromise()
      .then(res => (<Principle[]>res.data)
      .filter(principle => principle.id != 1))
  }

  getCommunicationPatterns() {
    return this.http.get<any>('assets/data/communicationpatterns.json')
      .toPromise()
      .then(res => <CommunicationPattern[]>res.data);
  }

  getPrinciplesAndSmells() {
    return this.http.get<any>('assets/data/principles.json')
      .toPromise()
      .then(res => <Principle[]>res.data);
  }

  getSmells() {
    return this.http.get<any>('assets/data/smells.json')
      .toPromise()
      .then(res => <Smell[]>res.data);
  }

  getSmellById(id: number) {
    return this.http.get<any>('assets/data/smells.json')
      .toPromise()
      .then(res => (<Smell[]>res.data).find(smell => smell.id == id))//smell.id === id))
  }

  runRemoteAnalysis(smells: Smell[] = null): Observable<Boolean> {

    this.clearSmells();

    let smells_ids: number[] = []; 
    // if(smells)
    smells_ids = smells.map(smell => smell.id);
    // else
    //  this.getSmells().then(smells =>{ 
    //     smells_ids =  smells.map(smell => smell.id);
    //     console.log(smells_ids);
    // });

    /*
      {
        smell: {
            name: "WobblyServicINTeractions"
            id: 1
        }
      }
    */

    const params = new HttpParams().set('smells', smells_ids.join());

    // let nodeIgnoreAlwaysSmells:string[];
    // this.gs.getGraph().getNodes().forEach(node=>{
    //   // console.log(node.getName());
    //   // console.log(node.getIgnoreAlwaysSmells());
    //   // nodeIgnoreAlwaysSmells.push(`${node.getName()}::`)
    //   //   node.getIgnoreAlwaysSmells().forEach(smell=>{

    //   //   })
    // })

    // return this.http.post(this.analysisUrl, { params })
    //   .subscribe((data) =>{
    //     console.log(response);
    //   });
    // TODO: the analysis should send ignore always command to the analyser.

    // Maybe instead of a get is s POST operation.
    return this.http.get(this.analysisUrl, { params })
      .pipe(
        map((response: Response) => {
          this.clearSmells(); 
          // reset analysed node array
          this.nodesWithSmells = [];
          // TODO: saved the analysed node ?? in order to have the history of the analysis.
          response['nodes'].forEach((nodeJson) => {
            let node = this.gs.getGraph().findNodeByName(nodeJson['name']);
            let anode = Analysed.getBuilder<joint.shapes.microtosca.Node>()
                                .setElement(node)
                                .setSmells(nodeJson['smells'].map((smellJson) => this.smellFactory.getNodeSmell(smellJson, node)))
                                .build();
            this.nodesWithSmells.push(anode);
          });

          this.groupsWithSmells = [];
          response['groups'].forEach((groupJson) => {
            // Build the smells of the group
            let group = this.gs.getGraph().findGroupByName(groupJson['name']);
            let groupSmells: GroupSmellObject[] = groupJson['smells'].map((smellJson) => this.smellFactory.getGroupSmell(smellJson, group));
            let agroup = Analysed.getBuilder<joint.shapes.microtosca.Group>()
                                .setElement(group)
                                .setSmells(groupSmells)
                                .build();
            console.debug("analysed group", agroup);
            this.groupsWithSmells.push(agroup);
            // Derive node actions from the group smells (e.g., AddApiGateway in edge nodes)
            groupSmells.flatMap(groupSmell => [...groupSmell.getMembers()])?.forEach((memberSmell) => {
              this.nodesWithSmells.push(
                Analysed.getBuilder<joint.shapes.microtosca.Node>()
                        .setElement(memberSmell[0])
                        .setSmells([memberSmell[1]])
                        .build()
              );
            })
          });
          return true;
        }),
        tap(_ => this.log(`Send analysis`),
        ),
        catchError((e: Response) => throwError(e))
      );
  }

  /** Log a AnalyserService message with the MessageService */
  private log(message: string) {
  }
}