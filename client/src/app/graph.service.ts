import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

import { Graph } from './model/graph';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: Graph;

  private graphUrl = environment.serverUrl + '/api/model?format=json';
  private graphUrlPost = environment.serverUrl + '/api/model';
  private graphUrlExamples= environment.serverUrl + '/api/example';

  constructor(private http: HttpClient) {
    this.graph = new Graph('hello-world');
  }

  getGraph(): Graph {
    return this.graph;
  }

  setGraph(g: Graph) {
    this.graph = g;
  }

  /** Export the graph to JSON format*/
  exportToJSON() {
    return JSON.stringify(this.graph.toJSON());
  }

  /** POST: upload the local graph to the server */
  uploadGraph(): Observable<string> {
    var graphJson = this.exportToJSON();
    console.log(graphJson);
    return this.http.post<string>(this.graphUrlPost, graphJson, httpOptions);
  }

  // download the graph stored into the server
  downloadGraph(): Observable<string> {
    return this.http.get<string>(this.graphUrl).pipe(
      tap(_ => this.log(`fetched graph`)),
      // catchError(this.handleError<Hero>(`getHero id=${id}`))
    );
  }

  downloadExample(name: string): Observable<string> {
    let params = new HttpParams().set("name", name);
    return this.http.get<string>(this.graphUrlExamples, { params: params }).pipe(
      tap(_ => this.log(`fetched example ${name}`)),
    );
  }

  /** Log a HeroService message with the MessageService */
  private log(message: string) {
    console.log(`GraphServiceService: ${message}`)
    // this.messageService.add(`HeroService: ${message}`);
  }

}