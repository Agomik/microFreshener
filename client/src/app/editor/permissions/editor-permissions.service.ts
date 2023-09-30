import { Injectable } from '@angular/core';
import { UserRole } from 'src/app/core/user-role';
import { GraphService } from 'src/app/graph/graph.service';

@Injectable({
  providedIn: 'root'
})
export class EditorPermissionsService {

  private readonly ALLOW_ALL = (...any: any[]) => { return true; }
  private readonly DENY_ALL = (...any: any[]) => { return false; }
  private readonly DENY_ALL_TWO_NODES = (n1, n2?) => { return false; }

  public enabledActions = {
    addNodeEnabled: false,
    addLinkEnabled: false,
  };

  public writePermissions = {
    isAllowed: this.DENY_ALL,
    isTeamWriteAllowed: this.DENY_ALL,
    linkable: this.DENY_ALL_TWO_NODES
  };

  constructor(
    private gs: GraphService
  ) {}

  updatePermissions(role: UserRole, teamName?: string) {
    switch(role) {
        case UserRole.ADMIN:
            // Admin can write everything
            this.writePermissions.isAllowed = this.ALLOW_ALL;
            this.writePermissions.linkable = this.ALLOW_ALL;
            this.writePermissions.isTeamWriteAllowed = this.ALLOW_ALL;
            break;
        case UserRole.TEAM:
            let team = this.gs.getGraph().findGroupByName(teamName);
            if(!team) {
              // The team doesn't exist in the graph, so block everything
              this.writePermissions.isAllowed = this.DENY_ALL;
              this.writePermissions.linkable = this.DENY_ALL;
              this.writePermissions.isTeamWriteAllowed = this.ALLOW_ALL;
            } else {
              // The team exists, so set the consequent permissions
              this.writePermissions.isAllowed = ( (cell) => (this.isEditingAllowedForATeam(team, cell)) );
              this.writePermissions.linkable = (n: joint.shapes.microtosca.Node, n2?: joint.shapes.microtosca.Node): boolean => {
                return this.gs.getGraph().getTeamOfNode(n) == team && (n2 ? this.gs.getGraph().getTeamOfNode(n2) == team : true);
              };
              this.writePermissions.isTeamWriteAllowed = this.DENY_ALL;
            }
            break;
          default:
            this.writePermissions.isAllowed = this.DENY_ALL;
            this.writePermissions.linkable = this.DENY_ALL;
            this.writePermissions.isTeamWriteAllowed = this.DENY_ALL;
      }
  }

  isEditingAllowedForATeam(team, cell): boolean {
    
    let outgoingLinks = this.gs.getGraph().getOutgoingLinksOfATeamFrontier(team);
    let nodesLinkedToFrontier = outgoingLinks.map((link) => { return link.getSourceElement(); });
    
    if(cell.isLink()) {
      // Check that the links the user is adding doesn't involve other teams' nodes
      let source = cell.getSourceElement();
      let sourceTeam = this.gs.getGraph().getTeamOfNode(source);
      if(!sourceTeam || sourceTeam != team) {
        return false;
      }
      let target = cell.getTargetElement();
      let targetTeam = this.gs.getGraph().getTeamOfNode(target);
      if(!targetTeam || targetTeam != team) {
        return false;
      }
    } else {
      let nodeTeam = this.gs.getGraph().getTeamOfNode(cell);
      // Check that the node belongs to the team and that it is not linked to the frontier
      if(nodeTeam != team || nodesLinkedToFrontier.includes(cell)) {
        return false;
      }
    }

    return true;
  }

  enable(name: string, isActive: boolean) {
    switch(name) {
      case "addNode":
      case "addDatastore":
      case "addMessageBroker":
      case "addMessageRouter":
        this.enabledActions.addNodeEnabled = isActive;
        break;
      case "addLink":
        this.enabledActions.addLinkEnabled = isActive;
        break;
    }
  }

  isAddNodeEnabled(cell?): boolean {
    return this.enabledActions.addNodeEnabled && (cell ? this.writePermissions.isAllowed(cell) : true);
  }

  isAddLinkEnabled(source?, target?): boolean {
    return this.enabledActions.addLinkEnabled;
  }

  isAddDatastoreEnabled(cell?): boolean {
    return this.isAddNodeEnabled(cell);
  }

  isAddMessageBrokerEnabled(cell?): boolean {
    return this.isAddNodeEnabled(cell);
  }

  isAddMessageRouter(cell?): boolean {
    return this.isAddNodeEnabled(cell);
  }

}
