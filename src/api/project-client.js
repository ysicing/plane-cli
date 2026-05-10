export class ProjectClient {
  constructor(client) {
    this.client = client;
  }

  list(query = {}) {
    return this.client.get(this.client.workspacePath("/projects/"), query);
  }

  get(projectId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/`));
  }

  create(body) {
    return this.client.post(this.client.workspacePath("/projects/"), body);
  }

  update(projectId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/`), body);
  }

  summary(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/summary/`), query);
  }

  listMembers(projectId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/members/`));
  }

  addMember(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/members/`), body);
  }

  listWorkspaceMembers() {
    return this.client.get(this.client.workspacePath("/members/"));
  }

  listStates(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/states/`), query);
  }

  listCycles(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/cycles/`), query);
  }

  listArchivedCycles(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/archived-cycles/`), query);
  }

  listCycleWorkItems(projectId, cycleId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/cycle-issues/`), query);
  }

  listModules(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/modules/`), query);
  }

  listArchivedModules(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/archived-modules/`), query);
  }

  listModuleWorkItems(projectId, moduleId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/module-issues/`), query);
  }

  listEpics(projectId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/epics/`));
  }

  listEpicWorkItems(projectId, epicId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/epics/${epicId}/issues/`));
  }

  listMilestones(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/milestones/`), query);
  }
}
