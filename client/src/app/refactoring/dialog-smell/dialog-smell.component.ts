import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { SmellObject } from '../smells/smell';
import { Command } from '../../commands/icommand';

@Component({
  selector: 'app-dialog-smell',
  templateUrl: './dialog-smell.component.html',
  styleUrls: ['./dialog-smell.component.css']
})
export class DialogSmellComponent implements OnInit {
  actions: Object[];
  selectedCommand: Command;

  jointNodeModel;
  smell: SmellObject;

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig, private messageService: MessageService) {
    this.actions = [];
    this.selectedCommand = null;
  }

  ngOnInit() {
    if (this.config.data) {
      this.jointNodeModel = this.config.data.model;
      this.smell = <SmellObject>this.config.data.selectedsmell;

      this.smell.getRefactorings().forEach(refactoring => {
        this.actions.push({ "label": refactoring.getName(), "description": refactoring.getDescription(), "value": refactoring });
      });
      this.moveIgnoreActionsToButtonInDropdownMenu();
    }
  }

  save() {
    this.ref.close(this.selectedCommand);
  }

  moveIgnoreActionsToButtonInDropdownMenu() {
    let ignoreActions = this.actions.filter(action => action["label"] === "Ignore Once" || action["label"] === "Ignore Always");
    if (ignoreActions.length > 0) {
      for(let action of ignoreActions) {
        let index = this.actions.indexOf(action);
        this.actions.splice(index, 1);
        this.actions.push(action);
      }
    }
  }

}
