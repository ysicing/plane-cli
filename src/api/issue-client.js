export class IssueClient {
  constructor(client) {
    this.client = client;
  }

  list(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/`), query);
  }

  get(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/`));
  }

  create(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/`), body);
  }

  update(projectId, issueId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/`), body);
  }

  getByKey(projectIdentifier, issueIdentifier, query = {}) {
    return this.client.get(this.client.workspacePath(`/work-items/${projectIdentifier}-${issueIdentifier}/`), query);
  }

  search(query = {}) {
    return this.client.get(this.client.workspacePath("/work-items/search/"), query);
  }

  listLabels(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/labels/`), query);
  }

  createLabel(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/labels/`), body);
  }

  listComments(projectId, issueId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/`), query);
  }

  createComment(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/`), body);
  }

  updateComment(projectId, issueId, commentId, body) {
    return this.client.patch(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/${commentId}/`),
      body
    );
  }

  listActivities(projectId, issueId, query = {}) {
    return this.client.get(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/activities/`),
      query
    );
  }

  listLinks(projectId, issueId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/`), query);
  }

  createLink(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/`), body);
  }

  updateLink(projectId, issueId, linkId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/${linkId}/`), body);
  }

  listRelations(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/relations/`));
  }

  createRelation(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/relations/`), body);
  }

  listAttachments(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/`));
  }

  createAttachmentUpload(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/`), body);
  }

  confirmAttachmentUpload(projectId, issueId, attachmentId, body = { is_uploaded: true }) {
    return this.client.patch(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/${attachmentId}/`),
      body
    );
  }
}
