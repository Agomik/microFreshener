import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { environment } from '../../../environments/environment';
import { GraphService } from "../../graph/graph.service";
import { MessageService } from 'primeng/api';
import { EditorNavigationService } from 'src/app/navigation/navigation.service';

@Component({
  selector: 'app-dialog-refine',
  templateUrl: './dialog-refine.component.html',
  styleUrls: ['./dialog-refine.component.css']
})
export class DialogRefineComponent implements OnInit {
  urlRefineKubernetes = environment.serverUrl + '/api/refine';
  urlRefineIstio = environment.serverUrl + '/api/refine/istio';

  constructor(private gs: GraphService, private navigation: EditorNavigationService, public ref: DynamicDialogRef, private messageService: MessageService, public config: DynamicDialogConfig) { }

  ngOnInit() {
  }

  onUploadKubernetes() {
    this.download();
  }

  onUploadIstio() {
    this.download();
  }

  download() {
    this.gs.dowloadGraph()
      .subscribe((data) => {
        //this.closeSidebar();
        console.log(data);
        //this.gs.builtFromJSON(data);
        this.navigation.applyLayout("LR");
        this.ref.close();
        this.messageService.add({ severity: 'success', summary: 'Graph downloaded correctly', detail: '' });
      });
  }
}
