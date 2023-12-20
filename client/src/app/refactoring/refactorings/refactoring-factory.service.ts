import { Injectable } from '@angular/core';
import { AddNodeCommand } from 'src/app/architecture/node-commands';
import { Command, CompositeCommand, Sequentiable } from 'src/app/commands/icommand';
import { AddMemberToTeamGroupCommand } from 'src/app/teams/team-commands';
import { SmellObject, GroupSmellObject } from '../smells/smell';
import { AddApiGatewayRefactoring } from './add-api-gateway';
import { AddCircuitBreakerRefactoring } from './add-circuit-breaker';
import { AddDataManagerRefactoring } from './add-data-manager';
import { AddMessageBrokerRefactoring } from './add-message-broker';
import { AddMessageRouterRefactoring } from './add-message-router';
import { AddServiceDiscoveryRefactoring } from './add-service-discovery';
import { MergeServicesRefactoring } from './merge-services-refactoring';
import { Refactoring, GroupRefactoring } from './refactoring-command';
import { SplitDatastoreRefactoring } from './split-datastore';
import { SplitTeamsByCouplingRefactoring } from './split-teams-by-coupling';
import { SplitTeamsByService as SplitTeamsByServiceRefactoring } from './split-teams-by-service';
import { UseTimeoutRefactoring } from './use-timeout';
import { SessionService } from 'src/app/core/session/session.service';
import { GraphService } from 'src/app/graph/graph.service';
import { Graph } from 'src/app/graph/model/graph';
import { MergeTeamsRefactoring } from './merge-teams';
import { SplitDatastoreAmongTeamsRefactoring } from './split-datastore-among-teams';

enum REFACTORING_NAMES {
  REFACTORING_ADD_SERVICE_DISCOVERY = 'Add-service-discovery',
  REFACTORING_ADD_MESSAGE_ROUTER = 'Add-message-router',
  REFACTORING_ADD_MESSAGE_BROKER = 'Add-message-broker',
  REFACTORING_ADD_CIRCUIT_BREAKER = 'Add-circuit-breaker',
  REFACTORING_USE_TIMEOUT = "Use-timeout",
  REFACTORING_MERGE_SERVICES = "Merge-service",
  REFACTORING_SPLIT_DATASTORE = "Split-Datastore",
  REFACTORING_ADD_DATA_MANAGER = "Add-data-manager",
  REFACTORING_ADD_API_GATEWAY = "Add-api-gateway",
  REFACTORING_SPLIT_TEAMS_BY_SERVICE = "Split-teams-by-service",
  REFACTORING_SPLIT_TEAMS_BY_COUPLING = "Split-teams-by-coupling",
  REFACTORING_MERGE_TEAMS = "Merge-teams"
}

@Injectable({
  providedIn: 'root'
})
export class RefactoringFactoryService {

  constructor(
    private gs: GraphService,
    private session: SessionService
  ) {}

  getRefactoring(refactoringName: string, smell: (SmellObject | GroupSmellObject)): Refactoring {
    if(smell instanceof SmellObject) {
      let refactoring = this.getNodeRefactoring(refactoringName, smell);
      if(this.session.isTeam()) {
        let team = this.gs.graph.findTeamByName(this.session.getTeamName())
        let teamBoundariesFilter = new TeamBoundariesFilter(team, {graph: this.gs.graph});
        refactoring = teamBoundariesFilter.filter(refactoring);
      }
      return refactoring;
    } else if(smell instanceof GroupSmellObject && this.session.isAdmin()) {
      return this.getGroupRefactoring(refactoringName, smell);
    }
  }

  private getNodeRefactoring(refactoringName: string, smell: SmellObject): Refactoring {

    switch (refactoringName) {

      case REFACTORING_NAMES.REFACTORING_ADD_MESSAGE_ROUTER:
        return new AddMessageRouterRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_ADD_MESSAGE_BROKER:
        return new AddMessageBrokerRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_ADD_SERVICE_DISCOVERY:
        return new AddServiceDiscoveryRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_ADD_CIRCUIT_BREAKER:
        return new AddCircuitBreakerRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_USE_TIMEOUT:
        return new UseTimeoutRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_MERGE_SERVICES:
        return new MergeServicesRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_SPLIT_DATASTORE:
        return new SplitDatastoreRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_ADD_DATA_MANAGER:
        return new AddDataManagerRefactoring(this.gs.graph, smell);
    }

  }

  private getGroupRefactoring(refactoringName: string, smell: GroupSmellObject): GroupRefactoring {
    
    switch(refactoringName){

      case REFACTORING_NAMES.REFACTORING_ADD_API_GATEWAY:
        return new AddApiGatewayRefactoring(this.gs.graph, smell);

      case REFACTORING_NAMES.REFACTORING_SPLIT_TEAMS_BY_SERVICE:
        return new SplitTeamsByServiceRefactoring(this.gs.graph, smell);
      
      case REFACTORING_NAMES.REFACTORING_SPLIT_TEAMS_BY_COUPLING:
        return new SplitTeamsByCouplingRefactoring(this.gs.graph, smell);

      case REFACTORING_NAMES.REFACTORING_SPLIT_DATASTORE:
        return new SplitDatastoreAmongTeamsRefactoring(this.gs.graph, smell);

      case REFACTORING_NAMES.REFACTORING_MERGE_TEAMS:
        return new MergeTeamsRefactoring(this.gs.graph, smell);
    }
  }
}

class TeamBoundariesFilter {

  constructor(
    private team: joint.shapes.microtosca.SquadGroup,
    private options?
  ) {}

  filter(refactoring: Refactoring): Refactoring {

    let command: CompositeCommand;

    if(refactoring instanceof MergeServicesRefactoring) {
      command = refactoring.command.command;
      this.addNewNodesToTeam(command);
      this.thenShowOnlyTeam(command);
    } else if(refactoring instanceof AddMessageRouterRefactoring ||
      refactoring instanceof AddMessageBrokerRefactoring ||
      refactoring instanceof SplitDatastoreRefactoring ||
      refactoring instanceof AddDataManagerRefactoring) {
      command = refactoring.command;
      this.addNewNodesToTeam(command);
    }

    return refactoring;
  }

  private addNewNodesToTeam(refactoringCommand: CompositeCommand): CompositeCommand {
    refactoringCommand.apply((simpleCommand: Command) => {
      if(simpleCommand instanceof AddNodeCommand) {
        simpleCommand = simpleCommand.bind(new AddMemberToTeamGroupCommand(this.team));
      }
      return simpleCommand;
    });
    return refactoringCommand;
  }

  private thenShowOnlyTeam(command: CompositeCommand) {
    let team = this.team;
    let graph: Graph = this.options.graph;
    let showOnlyTeamCommand = new class implements Command {
      execute(): void {
        graph.showOnlyTeam(team);
      }
      unexecute(): void {}
    };
    command.prepend(showOnlyTeamCommand);
    command.push(showOnlyTeamCommand);
  }
}