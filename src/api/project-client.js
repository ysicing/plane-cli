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
}
