import { makeObservable, observable } from "mobx";
// types
import { RootStore } from "store/root.store";
import { IUserLite } from "types";
import { IWorkspaceMemberStore, WorkspaceMemberStore } from "./workspace-member.store";
import { IProjectMemberStore, ProjectMemberStore } from "./project-member.store";

export interface IMemberRootStore {
  // observables
  memberMap: Record<string, IUserLite>;
  // sub-stores
  workspace: IWorkspaceMemberStore;
  project: IProjectMemberStore;
}

export class MemberRootStore implements IMemberRootStore {
  // observables
  memberMap: Record<string, IUserLite> = {};
  // root store
  rootStore: RootStore;
  // sub-stores
  workspace: IWorkspaceMemberStore;
  project: IProjectMemberStore;

  constructor(_rootStore: RootStore) {
    makeObservable(this, {
      // observables
      memberMap: observable,
    });

    // root store
    this.rootStore = _rootStore;
    // sub-stores
    this.workspace = new WorkspaceMemberStore(_rootStore);
    this.project = new ProjectMemberStore(_rootStore);
  }
}
