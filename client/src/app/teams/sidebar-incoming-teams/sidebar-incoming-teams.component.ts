import { Component } from '@angular/core';
import { TeamsService } from '../teams.service';
import { SessionService } from 'src/app/core/session/session.service';
import { UserRole } from 'src/app/core/user-role';
import { GraphService } from 'src/app/graph/graph.service';
import * as joint from 'jointjs';
import { Invoker } from 'src/app/commands/invoker';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar-incoming-teams',
  templateUrl: './sidebar-incoming-teams.component.html',
  styleUrls: ['./sidebar-incoming-teams.component.css']
})
export class SidebarIncomingTeamsComponent {

  groups: Array<{
    group: joint.shapes.microtosca.Group,
    recipients: joint.shapes.microtosca.Node[]
  }>;

  edge: joint.shapes.microtosca.Node[];

  invokerSubscription: Subscription;

  constructor(
    private session: SessionService,
    private teams: TeamsService,
    private commands: Invoker,
    private graphService: GraphService
  ) {}

  ngOnInit() {
    // Get the groups and relative interacting nodes
    this.updateIngoingRequestGroups();
    // Refresh at every graph update
    this.invokerSubscription = this.commands.subscribe(() => this.updateIngoingRequestGroups());
  }

  ngOnDestroy() {
    this.invokerSubscription?.unsubscribe();
  }

  updateIngoingRequestGroups() {
    // Defined for team members only
    if(this.session.getRole() == UserRole.TEAM) {
      let teamName = this.session.getTeamName();
      let team = this.teams.getTeam(teamName);
      this.updateTeams(team);
      this.updateEdge(team);
    }
  }

  updateTeams(team) {
    // Get the groups that use the team's nodes and sort (edge first, then by number of recipients descending)
    let groupsMap = this.teams.getTeamInteractions(team).ingoing.map(([g, ls]) => [g, ls.map((l: joint.shapes.microtosca.RunTimeLink) => <joint.shapes.microtosca.Node> l.getTargetElement())]);
    console.log(this.teams.getTeamInteractions(team).ingoing);
    this.groups = Array.from(groupsMap,
      ([group, recipients]: [joint.shapes.microtosca.SquadGroup, joint.shapes.microtosca.Node[]]) =>
      ({ group: group, recipients: recipients}));
    this.groups.sort((g1, g2) => {
        if(g1.group && g1.group instanceof joint.shapes.microtosca.EdgeGroup) return -1;
        if(g1.recipients.length >= g2.recipients.length) return -1;
      });
  }

  updateEdge(team) {
    this.edge = this.teams.getTeamEdgeNodes(team);
  }

  getSeverity(group: joint.shapes.microtosca.Group) {
    if(!group) return "warning"; // Unassigned nodes
    if(group instanceof joint.shapes.microtosca.EdgeGroup) return "success";
    else return "primary";
  }

  getUIGroupName(group: joint.shapes.microtosca.Group) {
    if(!group) return "Unassigned nodes";
    if(group instanceof joint.shapes.microtosca.EdgeGroup) return "External users";
    return group.getName();
  }

}
