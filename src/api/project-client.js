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

  delete(projectId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/`));
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

  updateMember(projectId, memberId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/members/${memberId}/`), body);
  }

  deleteMember(projectId, memberId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/members/${memberId}/`));
  }

  listWorkspaceMembers() {
    return this.client.get(this.client.workspacePath("/members/"));
  }

  listStates(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/states/`), query);
  }

  getState(projectId, stateId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/states/${stateId}/`));
  }

  createState(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/states/`), body);
  }

  updateState(projectId, stateId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/states/${stateId}/`), body);
  }

  deleteState(projectId, stateId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/states/${stateId}/`));
  }

  listCycles(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/cycles/`), query);
  }

  getCycle(projectId, cycleId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/`));
  }

  createCycle(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/cycles/`), body);
  }

  updateCycle(projectId, cycleId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/`), body);
  }

  deleteCycle(projectId, cycleId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/`));
  }

  listArchivedCycles(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/archived-cycles/`), query);
  }

  listCycleWorkItems(projectId, cycleId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/cycle-issues/`), query);
  }

  deleteCycleWorkItem(projectId, cycleId, issueId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/cycles/${cycleId}/cycle-issues/${issueId}/`));
  }

  listModules(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/modules/`), query);
  }

  getModule(projectId, moduleId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/`));
  }

  createModule(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/modules/`), body);
  }

  updateModule(projectId, moduleId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/`), body);
  }

  deleteModule(projectId, moduleId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/`));
  }

  listArchivedModules(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/archived-modules/`), query);
  }

  listModuleWorkItems(projectId, moduleId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/module-issues/`), query);
  }

  deleteModuleWorkItem(projectId, moduleId, issueId) {
    return this.client.delete(
      this.client.workspacePath(`/projects/${projectId}/modules/${moduleId}/module-issues/${issueId}/`)
    );
  }

  listEpics(projectId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/epics/`));
  }

  getEpic(projectId, epicId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/epics/${epicId}/`));
  }

  createEpic(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/epics/`), body);
  }

  updateEpic(projectId, epicId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/epics/${epicId}/`), body);
  }

  deleteEpic(projectId, epicId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/epics/${epicId}/`));
  }

  listEpicWorkItems(projectId, epicId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/epics/${epicId}/issues/`));
  }

  listMilestones(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/milestones/`), query);
  }

  getMilestone(projectId, milestoneId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/milestones/${milestoneId}/`));
  }

  createMilestone(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/milestones/`), body);
  }

  updateMilestone(projectId, milestoneId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/milestones/${milestoneId}/`), body);
  }

  deleteMilestone(projectId, milestoneId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/milestones/${milestoneId}/`));
  }

  listIntakeIssues(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/intake-issues/`), query);
  }

  getIntakeIssue(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/intake-issues/${issueId}/`));
  }

  createIntakeIssue(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/intake-issues/`), body);
  }

  updateIntakeIssue(projectId, issueId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/intake-issues/${issueId}/`), body);
  }

  deleteIntakeIssue(projectId, issueId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/intake-issues/${issueId}/`));
  }
}
