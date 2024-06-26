import { Command, CompositeCommand, ElementCommand } from '../commands/icommand';
import { Graph } from "../graph/model/graph";

export class AddTeamGroupCommand extends ElementCommand<joint.shapes.microtosca.SquadGroup> {

    graph: Graph;
    team_name: string;

    constructor(graph: Graph, team_name: string) {
        super(undefined);
        this.graph = graph;
        this.team_name = team_name;
    }

    execute() {
        let team = this.graph.addTeamGroup(this.team_name);
        this.set(team);
    }

    unexecute() {
        this.get().remove();
        //let team = this.graph.getGroup(this.team_name);
        //team.remove();
    }

}

export class AddMemberToTeamGroupCommand<T extends joint.shapes.microtosca.Node> extends ElementCommand<T> {

    constructor(private team: joint.shapes.microtosca.SquadGroup, node?: T) {
        super(node);
    }

    execute() {
        this.team.addMember(this.get());

        let members = this.team.getMembers();
        let currentMember = this.get();
        let factor = 500;

        members.forEach((member) => {
            if (member !== currentMember) {
                let angle = Math.atan2(member.position().y - currentMember.position().y, member.position().x - currentMember.position().x);
                let currentDistance = Math.sqrt(Math.pow(member.position().x - currentMember.position().x, 2) + Math.pow(member.position().y - currentMember.position().y, 2));
                let distance = factor/Math.max(1, Math.log(currentDistance)); // Kind of magic number, may be improved
                let dx = Math.cos(angle) * distance;
                let dy = Math.sin(angle) * distance;
                member.translate(dx, dy);
            }
        });

        this.team.fitEmbeds({ padding: Graph.TEAM_PADDING });
    }

    unexecute() {
        this.team.removeMember(this.get());
        this.team.fitEmbeds({ padding: Graph.TEAM_PADDING });
    }

}

export class RemoveMemberFromTeamGroupCommand<T extends joint.shapes.microtosca.Node> extends ElementCommand<T> {

    constructor(private team: joint.shapes.microtosca.SquadGroup, node?: T) {
        super(node);
    }

    execute() {
        this.team.removeMember(this.get());
        this.team.fitEmbeds({ padding: Graph.TEAM_PADDING });
    }

    unexecute() {
        this.team.addMember(this.get());
        this.team.fitEmbeds({ padding: Graph.TEAM_PADDING });
    }
    
}

export class RemoveTeamGroupCommand implements Command {

    removeMemberCommands: RemoveMemberFromTeamGroupCommand<joint.shapes.microtosca.Node>[];

    constructor(
        private graph: Graph,
        private team: joint.shapes.microtosca.SquadGroup
    ) {}

    execute() {
        this.removeMemberCommands = [];
        this.team.getMembers().map((member) => new RemoveMemberFromTeamGroupCommand(this.team, member))
        .forEach((command) => {
            this.removeMemberCommands.push(command);
            command.execute();
        });
        this.team = this.team.remove();
    }

    unexecute() {
        this.graph.addCell(this.team);
        this.removeMemberCommands.forEach((command) => command.unexecute());
    }
}

export class AddManyMembersToTeamGroupCommand extends ElementCommand<joint.shapes.microtosca.SquadGroup> {

    command: Command;

    constructor(private members: joint.shapes.microtosca.Node[], team?: joint.shapes.microtosca.SquadGroup) {
        super(team);
    }

    execute() {
        let team = this.get();
        console.log("adding members to team", this.members, team);
        this.command = CompositeCommand.of(this.members.map((n) => new AddMemberToTeamGroupCommand(team, n)));
        this.command.execute();
    }
    unexecute() {
        this.command.unexecute();
    }

}

export class MergeTeamsCommand implements Command {

    command: Command;

    constructor(graph: Graph, newTeamName: string, ...teams: joint.shapes.microtosca.SquadGroup[]) {
        let cmds = [];
        teams.forEach((team) => cmds.push(new RemoveTeamGroupCommand(graph, team)));
        let members: joint.shapes.microtosca.Node[] = teams.flatMap((t) => t.getMembers());
        cmds.push(new AddTeamGroupCommand(graph, newTeamName).bind(new AddManyMembersToTeamGroupCommand(members)));
        this.command = CompositeCommand.of(cmds);
    }

    execute() {
        this.command.execute();
    }

    unexecute() {
        this.command.unexecute();
    }

}