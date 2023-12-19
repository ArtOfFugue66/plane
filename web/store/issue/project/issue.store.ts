import { action, makeObservable, observable, runInAction, computed } from "mobx";
import set from "lodash/set";
// base class
import { IssueHelperStore } from "../helpers/issue-helper.store";
// store
import { IIssueRootStore } from "../root.store";
// services
import { IssueService } from "services/issue/issue.service";
// types
import {
  IGroupedIssues,
  IIssue,
  IIssueResponse,
  ISubGroupedIssues,
  TIssueGroupByOptions,
  TLoader,
  TUnGroupedIssues,
  ViewFlags,
} from "types";

export interface IProjectIssues {
  loader: TLoader;
  issues: { [project_id: string]: string[] };
  // computed
  getIssuesIds: IGroupedIssues | ISubGroupedIssues | TUnGroupedIssues | undefined;
  // action
  fetchIssues: (workspaceSlug: string, projectId: string, loadType: TLoader) => Promise<IIssueResponse>;
  createIssue: (workspaceSlug: string, projectId: string, data: Partial<IIssue>) => Promise<IIssue>;
  updateIssue: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<IIssue>) => Promise<IIssue>;
  removeIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<IIssue>;
  quickAddIssue: (workspaceSlug: string, projectId: string, data: IIssue) => Promise<IIssue>;
  viewFlags: ViewFlags;
}

export class ProjectIssues extends IssueHelperStore implements IProjectIssues {
  // observable
  loader: TLoader = "init-loader";
  issues: { [project_id: string]: string[] } = {};
  // services
  issueService;
  // root store
  rootIssueStore: IIssueRootStore;
  //viewData
  viewFlags = {
    enableQuickAdd: true,
    enableIssueCreation: true,
    enableInlineEditing: true,
  };

  constructor(_rootStore: IIssueRootStore) {
    super(_rootStore);

    makeObservable(this, {
      // observable
      loader: observable.ref,
      issues: observable,
      // computed
      getIssuesIds: computed,
      // action
      fetchIssues: action,
      createIssue: action,
      updateIssue: action,
      removeIssue: action,
      quickAddIssue: action,
    });

    // services
    this.issueService = new IssueService();
    // root store
    this.rootIssueStore = _rootStore;
  }

  get getIssuesIds() {
    const projectId = this.rootStore?.projectId;
    if (!projectId) return undefined;

    const displayFilters = this.rootStore?.projectIssuesFilter?.issueFilters?.displayFilters;
    if (!displayFilters) return undefined;

    const subGroupBy = displayFilters?.sub_group_by;
    const groupBy = displayFilters?.group_by;
    const orderBy = displayFilters?.order_by;
    const layout = displayFilters?.layout;

    const _issues = this.rootStore.issues.getIssuesByKey("project", projectId);
    if (!_issues) return undefined;

    let issues: IIssueResponse | IGroupedIssues | ISubGroupedIssues | TUnGroupedIssues | undefined = undefined;

    if (layout === "list" && orderBy) {
      if (groupBy) issues = this.groupedIssues(groupBy, orderBy, _issues);
      else issues = this.unGroupedIssues(orderBy, _issues);
    } else if (layout === "kanban" && groupBy && orderBy) {
      if (subGroupBy) issues = this.subGroupedIssues(subGroupBy, groupBy, orderBy, _issues);
      else issues = this.groupedIssues(groupBy, orderBy, _issues);
    } else if (layout === "calendar")
      issues = this.groupedIssues("target_date" as TIssueGroupByOptions, "target_date", _issues, true);
    else if (layout === "spreadsheet") issues = this.unGroupedIssues(orderBy ?? "-created_at", _issues);
    else if (layout === "gantt_chart") issues = this.unGroupedIssues(orderBy ?? "sort_order", _issues);

    return issues;
  }

  fetchIssues = async (workspaceSlug: string, projectId: string, loadType: TLoader = "init-loader") => {
    try {
      this.loader = loadType;

      const params = this.rootStore?.projectIssuesFilter?.appliedFilters;
      const response = await this.issueService.getIssues(workspaceSlug, projectId, params);

      runInAction(() => {
        set(this.issues, [projectId], Object.keys(response));
        this.loader = undefined;
      });

      this.rootStore.issues.addIssue(Object.values(response));

      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  createIssue = async (workspaceSlug: string, projectId: string, data: Partial<IIssue>) => {
    try {
      const response = await this.issueService.createIssue(workspaceSlug, projectId, data);

      runInAction(() => {
        this.issues[projectId].push(response.id);
      });

      this.rootStore.issues.addIssue([response]);

      return response;
    } catch (error) {
      this.fetchIssues(workspaceSlug, projectId, "mutation");
      throw error;
    }
  };

  updateIssue = async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<IIssue>) => {
    try {
      if (!issueId || !this.issues[projectId]) return;

      this.rootStore.issues.updateIssue(issueId, data);

      const response = await this.issueService.patchIssue(workspaceSlug, projectId, issueId, data);
      return response;
    } catch (error) {
      this.fetchIssues(workspaceSlug, projectId, "mutation");
      throw error;
    }
  };

  removeIssue = async (workspaceSlug: string, projectId: string, issueId: string) => {
    try {
      if (!issueId || !this.issues[projectId]) return;

      const issueIndex = this.issues[projectId].findIndex((_issueId) => _issueId === issueId);
      runInAction(() => {
        this.issues[projectId].splice(issueIndex, 1);
      });

      this.rootStore.issues.removeIssue(issueId);

      const response = await this.issueService.deleteIssue(workspaceSlug, projectId, issueId);

      return response;
    } catch (error) {
      this.fetchIssues(workspaceSlug, projectId, "mutation");
      throw error;
    }
  };

  quickAddIssue = async (workspaceSlug: string, projectId: string, data: IIssue) => {
    try {
      const response = await this.issueService.createIssue(workspaceSlug, projectId, data);

      const quickAddIssueIndex = this.issues[projectId].findIndex((_issueId) => _issueId === data.id);
      runInAction(() => {
        this.issues[projectId].splice(quickAddIssueIndex, 1);
        this.rootStore.issues.removeIssue(data.id);

        this.issues[projectId].push(response.id);
        this.rootStore.issues.addIssue([response]);
      });

      return response;
    } catch (error) {
      this.fetchIssues(workspaceSlug, projectId, "mutation");
      throw error;
    }
  };
}
