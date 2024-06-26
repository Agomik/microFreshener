import { Injectable } from '@angular/core';
import { Command, CompositeCommand } from 'src/app/commands/icommand';
import { Invoker } from 'src/app/commands/invoker';
import { AddMemberToTeamGroupCommand, AddTeamGroupCommand, RemoveMemberFromTeamGroupCommand, RemoveTeamGroupCommand } from '../team-commands';
import { GraphService } from 'src/app/graph/graph.service';
import { Graph } from 'src/app/graph/model/graph';

@Injectable({
  providedIn: 'root'
})
export class TeamEditingService {

  constructor(
    private graphService: GraphService,
    private invoker: Invoker
  ) { }

  getTeams(): joint.shapes.microtosca.SquadGroup[] {
    return this.graphService.graph.getTeamGroups();
  }

  getTeam(teamName: string) {
    return this.graphService.graph.getTeam(teamName);
  }

  async addTeam(name: string, selectedNodes?: joint.shapes.microtosca.Node[]) {
    if(this.graphService.graph.findGroupByName(name)) {
      return Promise.reject(`A group called ${name} already exists.`);
    }
    let commandToExecute;
    if(!selectedNodes) {
      // Add a new empty team
      commandToExecute = new AddTeamGroupCommand(this.graphService.graph, name);
    } else {
      // Add a new team and add its nodes atomically
      let createTeamThenMoveSelectedMembersIntoIt = this.buildCreateTeamThenAddNodesCommand(this.graphService.graph, name, selectedNodes);
      commandToExecute = createTeamThenMoveSelectedMembersIntoIt;
    }
    return this.invoker.executeCommand(commandToExecute);
  }

  async removeTeam(team: joint.shapes.microtosca.SquadGroup) {
    return this.invoker.executeCommand(new RemoveTeamGroupCommand(this.graphService.graph, team));
  }

  async addMemberToTeam(member: joint.shapes.microtosca.Node, team: joint.shapes.microtosca.SquadGroup) {
    let command = this.buildEitherAddMemberOrMoveMemberCommand(team, member);
    return this.invoker.executeCommand(command);
  }

  async addMembersToTeam(members: joint.shapes.microtosca.Node[], team: joint.shapes.microtosca.SquadGroup) {
    let membersToAdd = members.filter((member) => this.graphService.graph.getTeamOfNode(member) != team);
    if(membersToAdd.length > 0) {
      return this.invoker.executeCommand(
        CompositeCommand.of(members.map((member) => this.buildEitherAddMemberOrMoveMemberCommand(team, member)))
      );
    } else return Promise.resolve();
  }

  private buildCreateTeamThenAddNodesCommand(graph: Graph, newTeamName: string, selectedNodes: joint.shapes.microtosca.Node[]): Command {
    let buildMoveNodeCommand = this.buildMoveNodeCommand;
    return new class implements Command {
      private newTeamCommand: Command;
      private addOrMoveMembersToNewTeamCommands: Command[];
      execute() {
        // Create the new team
        this.newTeamCommand = new AddTeamGroupCommand(graph, newTeamName);
        this.newTeamCommand.execute();
        let newTeam = graph.findTeamByName(newTeamName);
        // Move nodes into it
        this.addOrMoveMembersToNewTeamCommands =
              selectedNodes
              .map((node) => [node, graph.getTeamOfNode(node)])
              .map(([node, previousTeam]: [joint.shapes.microtosca.Node, joint.shapes.microtosca.SquadGroup]) => {
                    if(previousTeam) { console.log("previousTeam: node, team", node?.getName(), previousTeam?.getName()); return buildMoveNodeCommand(node, previousTeam, newTeam); }
                    else { return new AddMemberToTeamGroupCommand(newTeam, node); } });
        this.addOrMoveMembersToNewTeamCommands.forEach((cmd) => cmd.execute());
      }

      unexecute() {
        this.addOrMoveMembersToNewTeamCommands.forEach((cmd) => cmd.unexecute());
        this.newTeamCommand.unexecute();
      }
    }
  }

  private buildMoveNodeCommand(node: joint.shapes.microtosca.Node, fromTeam: joint.shapes.microtosca.SquadGroup, toTeam: joint.shapes.microtosca.SquadGroup) {
    return new class implements Command {
      removeMemberFromTeam;
      addMemberToTeam;
      constructor() {
        this.removeMemberFromTeam = new RemoveMemberFromTeamGroupCommand(fromTeam, node)
        this.addMemberToTeam = new AddMemberToTeamGroupCommand(toTeam, node);
      }
      execute() {
        this.removeMemberFromTeam.execute();
        this.addMemberToTeam.execute();
      }
      unexecute() {
        this.addMemberToTeam.unexecute();
        this.removeMemberFromTeam.unexecute();
      }
    }
  }

  private buildEitherAddMemberOrMoveMemberCommand(team: joint.shapes.microtosca.SquadGroup, member: joint.shapes.microtosca.Node) {
    let previousTeam = this.graphService.graph.getTeamOfNode(member);
    //console.debug(member?.getName(), "is coming from team", previousTeam?.getName());
    if(previousTeam) {
      return this.buildMoveNodeCommand(member, previousTeam, team);
    } else {
      console.debug(`Adding ${member?.getName()} to team ${team?.getName()}`);
      return new AddMemberToTeamGroupCommand(team, member);
    }
  }

  async removeMemberFromTeam(member: joint.shapes.microtosca.Node, team: joint.shapes.microtosca.SquadGroup) {
    var command = new RemoveMemberFromTeamGroupCommand(team, member);
    return this.invoker.executeCommand(command);
  }

  getTeamOfNode(node: joint.shapes.microtosca.Node) {
    return this.graphService.graph.getTeamOfNode(node);
  }

  isTeamGroup(node: joint.dia.Cell): boolean {
    return this.graphService.graph.isTeamGroup(node);
  }

  teamExists(name: string): boolean {
    return this.graphService.graph.findTeamByName(name) ? true : false;
  }
}
