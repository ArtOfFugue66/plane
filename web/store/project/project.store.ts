import set from "lodash/set";
import { observable, action, computed, makeObservable, runInAction } from "mobx";
//types
import { RootStore } from "../root.store";
import { IProject } from "types";
//services
import { IssueLabelService, IssueService } from "services/issue";
import { ProjectService, ProjectStateService } from "services/project";
import { orderArrayBy } from "helpers/array.helper";

export interface IProjectStore {
  // states
  loader: boolean;
  error: any | null;
  // observables
  searchQuery: string;
  projectMap: {
    [projectId: string]: IProject; // projectId: project Info
  };
  // computed
  searchedProjects: string[];
  workspaceProjects: string[] | null;
  joinedProjects: string[];
  favoriteProjects: string[];
  currentProjectDetails: IProject | undefined;
  // actions
  setSearchQuery: (query: string) => void;
  getProjectById: (projectId: string) => IProject | null;

  fetchProjects: (workspaceSlug: string) => Promise<IProject[]>;
  fetchProjectDetails: (workspaceSlug: string, projectId: string) => Promise<any>;

  addProjectToFavorites: (workspaceSlug: string, projectId: string) => Promise<any>;
  removeProjectFromFavorites: (workspaceSlug: string, projectId: string) => Promise<any>;

  orderProjectsWithSortOrder: (sourceIndex: number, destinationIndex: number, projectId: string) => number;
  updateProjectView: (workspaceSlug: string, projectId: string, viewProps: any) => Promise<any>;

  createProject: (workspaceSlug: string, data: any) => Promise<any>;
  updateProject: (workspaceSlug: string, projectId: string, data: Partial<IProject>) => Promise<any>;
  deleteProject: (workspaceSlug: string, projectId: string) => Promise<void>;
}

export class ProjectStore implements IProjectStore {
  // states
  loader: boolean = false;
  error: any | null = null;
  // observables
  searchQuery: string = "";
  projectMap: {
    [projectId: string]: IProject; // projectId: project Info
  } = {};
  // root store
  rootStore: RootStore;
  // service
  projectService;
  issueLabelService;
  issueService;
  stateService;

  constructor(_rootStore: RootStore) {
    makeObservable(this, {
      // states
      loader: observable.ref,
      error: observable.ref,
      // observables
      searchQuery: observable.ref,
      projectMap: observable,
      // computed
      searchedProjects: computed,
      workspaceProjects: computed,
      currentProjectDetails: computed,
      joinedProjects: computed,
      favoriteProjects: computed,
      // actions
      setSearchQuery: action,
      fetchProjects: action,
      fetchProjectDetails: action,

      addProjectToFavorites: action,
      removeProjectFromFavorites: action,

      orderProjectsWithSortOrder: action,
      updateProjectView: action,
      createProject: action,
      updateProject: action,
    });

    this.rootStore = _rootStore;

    this.projectService = new ProjectService();
    this.issueService = new IssueService();
    this.issueLabelService = new IssueLabelService();
    this.stateService = new ProjectStateService();
  }

  get searchedProjects() {
    if (!this.rootStore.app.router.workspaceSlug) return [];

    const projectIds = Object.keys(this.projectMap);
    return this.searchQuery === ""
      ? projectIds
      : projectIds?.filter((projectId) => {
          this.projectMap[projectId].name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            this.projectMap[projectId].identifier.toLowerCase().includes(this.searchQuery.toLowerCase());
        });
  }

  get workspaceProjects() {
    if (!this.rootStore.app.router.workspaceSlug) return null;

    const projectIds = Object.keys(this.projectMap);
    if (!projectIds) return null;
    return projectIds;
  }

  get currentProjectDetails() {
    if (!this.rootStore.app.router.projectId) return;
    return this.projectMap[this.rootStore.app.router.projectId];
  }

  get joinedProjects() {
    if (!this.rootStore.app.router.workspaceSlug) return [];

    const projectIds = Object.keys(this.projectMap);

    return orderArrayBy(
      projectIds?.filter((projectId) => this.projectMap[projectId].is_member),
      "sort_order",
      "ascending"
    );
  }

  get favoriteProjects() {
    if (!this.rootStore.app.router.workspaceSlug) return [];

    const projectIds = Object.keys(this.projectMap);

    return orderArrayBy(
      projectIds?.filter((projectId) => this.projectMap[projectId].is_favorite),
      "sort_order",
      "ascending"
    );
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
  };

  /**
   * get Workspace projects using workspace slug
   * @param workspaceSlug
   * @returns
   *
   */
  fetchProjects = async (workspaceSlug: string) => {
    try {
      const projectsResponse = await this.projectService.getProjects(workspaceSlug);

      runInAction(() => {
        projectsResponse.forEach((project) => {
          set(this.projectMap, [project.id], project);
        });
      });

      return projectsResponse;
    } catch (error) {
      console.log("Failed to fetch project from workspace store");
      throw error;
    }
  };

  fetchProjectDetails = async (workspaceSlug: string, projectId: string) => {
    try {
      const response = await this.projectService.getProject(workspaceSlug, projectId);

      runInAction(() => {
        set(this.projectMap, [projectId], response);
      });
      return response;
    } catch (error) {
      console.log("Error while fetching project details", error);
      throw error;
    }
  };

  getProjectById = (projectId: string) => {
    const projectInfo = this.projectMap[projectId] || null;
    return projectInfo;
  };

  addProjectToFavorites = async (workspaceSlug: string, projectId: string) => {
    try {
      const currentProject = this.getProjectById(projectId);

      if (currentProject.is_favorite) return;

      runInAction(() => {
        set(this.projectMap, [projectId, "is_favorite"], true);
      });

      const response = await this.projectService.addProjectToFavorites(workspaceSlug, projectId);
      return response;
    } catch (error) {
      console.log("Failed to add project to favorite");

      runInAction(() => {
        set(this.projectMap, [projectId, "is_favorite"], false);
      });

      throw error;
    }
  };

  removeProjectFromFavorites = async (workspaceSlug: string, projectId: string) => {
    try {
      const currentProject = this.getProjectById(projectId);

      if (!currentProject.is_favorite) return;

      runInAction(() => {
        set(this.projectMap, [projectId, "is_favorite"], false);
      });

      const response = await this.projectService.removeProjectFromFavorites(workspaceSlug, projectId);
      await this.fetchProjects(workspaceSlug);
      return response;
    } catch (error) {
      console.log("Failed to add project to favorite");

      runInAction(() => {
        set(this.projectMap, [projectId, "is_favorite"], true);
      });
      throw error;
    }
  };

  orderProjectsWithSortOrder = (sortIndex: number, destinationIndex: number, projectId: string) => {
    try {
      const workspaceSlug = this.rootStore.app.router.workspaceSlug;
      if (!workspaceSlug) return 0;

      const projectsList = Object.values(this.projectMap || {}) || [];
      let updatedSortOrder = projectsList[sortIndex].sort_order;

      if (destinationIndex === 0) updatedSortOrder = (projectsList[0].sort_order as number) - 1000;
      else if (destinationIndex === projectsList.length - 1)
        updatedSortOrder = (projectsList[projectsList.length - 1].sort_order as number) + 1000;
      else {
        const destinationSortingOrder = projectsList[destinationIndex].sort_order as number;
        const relativeDestinationSortingOrder =
          sortIndex < destinationIndex
            ? (projectsList[destinationIndex + 1].sort_order as number)
            : (projectsList[destinationIndex - 1].sort_order as number);

        updatedSortOrder = (destinationSortingOrder + relativeDestinationSortingOrder) / 2;
      }

      runInAction(() => {
        set(this.projectMap, [projectId, "sort_order"], updatedSortOrder);
      });

      return updatedSortOrder;
    } catch (error) {
      console.log("failed to update sort order of the projects");
      return 0;
    }
  };

  updateProjectView = async (workspaceSlug: string, projectId: string, viewProps: any) => {
    try {
      const response = await this.projectService.setProjectView(workspaceSlug, projectId, viewProps);
      await this.fetchProjects(workspaceSlug);

      return response;
    } catch (error) {
      console.log("Failed to update sort order of the projects");
      throw error;
    }
  };

  createProject = async (workspaceSlug: string, data: any) => {
    try {
      const response = await this.projectService.createProject(workspaceSlug, data);

      runInAction(() => {
        set(this.projectMap, [response.id], response);
      });

      return response;
    } catch (error) {
      console.log("Failed to create project from project store");
      throw error;
    }
  };

  updateProject = async (workspaceSlug: string, projectId: string, data: Partial<IProject>) => {
    try {
      const currentProject = this.getProjectById(projectId);

      runInAction(() => {
        set(this.projectMap, [projectId], { ...currentProject, ...data });
      });

      const response = await this.projectService.updateProject(workspaceSlug, projectId, data);
      return response;
    } catch (error) {
      console.log("Failed to create project from project store");

      this.fetchProjects(workspaceSlug);
      this.fetchProjectDetails(workspaceSlug, projectId);
      throw error;
    }
  };

  deleteProject = async (workspaceSlug: string, projectId: string) => {
    try {
      if (!this.projectMap?.[projectId]) return;

      runInAction(() => {
        delete this.projectMap[projectId];
      });

      await this.projectService.deleteProject(workspaceSlug, projectId);
    } catch (error) {
      console.log("Failed to delete project from project store");
      this.fetchProjects(workspaceSlug);
    }
  };
}
