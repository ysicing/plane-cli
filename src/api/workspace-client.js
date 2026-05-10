export class WorkspaceClient {
  constructor(client) {
    this.client = client;
  }

  listInvitations() {
    return this.client.get(this.client.workspacePath("/invitations/"));
  }

  getInvitation(invitationId) {
    return this.client.get(this.client.workspacePath(`/invitations/${invitationId}/`));
  }

  createInvitation(body) {
    return this.client.post(this.client.workspacePath("/invitations/"), body);
  }

  updateInvitation(invitationId, body) {
    return this.client.patch(this.client.workspacePath(`/invitations/${invitationId}/`), body);
  }

  deleteInvitation(invitationId) {
    return this.client.delete(this.client.workspacePath(`/invitations/${invitationId}/`));
  }

  listStickies() {
    return this.client.get(this.client.workspacePath("/stickies/"));
  }

  getSticky(stickyId) {
    return this.client.get(this.client.workspacePath(`/stickies/${stickyId}/`));
  }

  createSticky(body) {
    return this.client.post(this.client.workspacePath("/stickies/"), body);
  }

  updateSticky(stickyId, body) {
    return this.client.patch(this.client.workspacePath(`/stickies/${stickyId}/`), body);
  }

  deleteSticky(stickyId) {
    return this.client.delete(this.client.workspacePath(`/stickies/${stickyId}/`));
  }
}
