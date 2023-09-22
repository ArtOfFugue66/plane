import React from "react";

import { useRouter } from "next/router";

// headless ui
import { Popover, Transition } from "@headlessui/react";
// hooks
import useMyIssuesFilters from "hooks/my-issues/use-my-issues-filter";
import useEstimateOption from "hooks/use-estimate-option";
// components
import { MyIssuesSelectFilters } from "components/issues";
// ui
import { CustomMenu, ToggleSwitch, Tooltip } from "components/ui";
// icons
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { FormatListBulletedOutlined } from "@mui/icons-material";
import { CreditCard } from "lucide-react";
// helpers
import { replaceUnderscoreIfSnakeCase } from "helpers/string.helper";
import { checkIfArraysHaveSameElements } from "helpers/array.helper";
// types
import { Properties, TIssueViewOptions } from "types";
// constants
import { GROUP_BY_OPTIONS, ORDER_BY_OPTIONS, FILTER_ISSUE_OPTIONS } from "constants/issue";

const issueViewOptions: { type: TIssueViewOptions; Icon: any }[] = [
  {
    type: "list",
    Icon: FormatListBulletedOutlined,
  },
  {
    type: "spreadsheet",
    Icon: CreditCard,
  },
];

export const WorkspaceIssuesViewOptions: React.FC = () => {
  const router = useRouter();
  const { workspaceSlug, workspaceViewId } = router.query;

  const { displayFilters, setDisplayFilters, properties, setProperty, filters, setFilters } =
    useMyIssuesFilters(workspaceSlug?.toString());

  const { isEstimateActive } = useEstimateOption();

  const workspaceViewPathName = [
    "workspace-views/all-issues",
    "workspace-views/assigned",
    "workspace-views/created",
    "workspace-views/subscribed",
  ];

  const isWorkspaceViewPath = workspaceViewPathName.some((pathname) =>
    router.pathname.includes(pathname)
  );

  const showFilters = isWorkspaceViewPath || workspaceViewId;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-x- px-1 py-0.5 rounded bg-custom-sidebar-background-90 ">
        {issueViewOptions.map((option) => (
          <Tooltip
            key={option.type}
            tooltipContent={
              <span className="capitalize">{replaceUnderscoreIfSnakeCase(option.type)} View</span>
            }
            position="bottom"
          >
            <button
              type="button"
              className={`grid h-7 w-7 place-items-center rounded p-1 outline-none hover:bg-custom-sidebar-background-100 duration-300 ${
                displayFilters?.layout === option.type
                  ? "bg-custom-sidebar-background-100 shadow-sm"
                  : "text-custom-sidebar-text-200"
              }`}
              onClick={() => {
                setDisplayFilters({ layout: option.type });
                if (option.type === "spreadsheet")
                  router.push(`/${workspaceSlug}/workspace-views/all-issues`);
                else router.push(`/${workspaceSlug}/workspace-views`);
              }}
            >
              <option.Icon
                sx={{
                  fontSize: 16,
                }}
                className={option.type === "spreadsheet" ? "h-4 w-4" : ""}
              />
            </button>
          </Tooltip>
        ))}
      </div>

      {showFilters && (
        <>
          <MyIssuesSelectFilters
            filters={filters}
            onSelect={(option) => {
              const key = option.key as keyof typeof filters;

              if (key === "start_date" || key === "target_date") {
                const valueExists = checkIfArraysHaveSameElements(
                  filters?.[key] ?? [],
                  option.value
                );

                setFilters({
                  [key]: valueExists ? null : option.value,
                });
              } else {
                const valueExists = filters[key]?.includes(option.value);

                if (valueExists)
                  setFilters({
                    [option.key]: ((filters[key] ?? []) as any[])?.filter(
                      (val) => val !== option.value
                    ),
                  });
                else
                  setFilters({
                    [option.key]: [...((filters[key] ?? []) as any[]), option.value],
                  });
              }
            }}
            direction="left"
            height="rg"
          />
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  className={`group flex items-center gap-2 rounded-md border border-custom-border-200 bg-transparent px-3 py-1.5 text-xs hover:bg-custom-sidebar-background-90 hover:text-custom-sidebar-text-100 focus:outline-none duration-300 ${
                    open
                      ? "bg-custom-sidebar-background-90 text-custom-sidebar-text-100"
                      : "text-custom-sidebar-text-200"
                  }`}
                >
                  Display
                  <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
                </Popover.Button>

                <Transition
                  as={React.Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel className="absolute right-0 z-30 mt-1 w-screen max-w-xs transform rounded-lg border border-custom-border-200 bg-custom-background-90 p-3 shadow-lg">
                    <div className="relative divide-y-2 divide-custom-border-200">
                      <div className="space-y-4 pb-3 text-xs">
                        {displayFilters?.layout !== "calendar" &&
                          displayFilters?.layout !== "spreadsheet" && (
                            <>
                              <div className="flex items-center justify-between">
                                <h4 className="text-custom-text-200">Group by</h4>
                                <div className="w-28">
                                  <CustomMenu
                                    label={
                                      displayFilters?.group_by === "project"
                                        ? "Project"
                                        : GROUP_BY_OPTIONS.find(
                                            (option) => option.key === displayFilters?.group_by
                                          )?.name ?? "Select"
                                    }
                                    className="!w-full"
                                    buttonClassName="w-full"
                                  >
                                    {GROUP_BY_OPTIONS.map((option) => {
                                      if (
                                        displayFilters?.layout === "spreadsheet" &&
                                        option.key === null
                                      )
                                        return null;
                                      if (
                                        option.key === "state" ||
                                        option.key === "created_by" ||
                                        option.key === "assignees"
                                      )
                                        return null;

                                      return (
                                        <CustomMenu.MenuItem
                                          key={option.key}
                                          onClick={() =>
                                            setDisplayFilters({ group_by: option.key })
                                          }
                                        >
                                          {option.name}
                                        </CustomMenu.MenuItem>
                                      );
                                    })}
                                  </CustomMenu>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <h4 className="text-custom-text-200">Order by</h4>
                                <div className="w-28">
                                  <CustomMenu
                                    label={
                                      ORDER_BY_OPTIONS.find(
                                        (option) => option.key === displayFilters?.order_by
                                      )?.name ?? "Select"
                                    }
                                    className="!w-full"
                                    buttonClassName="w-full"
                                  >
                                    {ORDER_BY_OPTIONS.map((option) => {
                                      if (
                                        displayFilters?.group_by === "priority" &&
                                        option.key === "priority"
                                      )
                                        return null;
                                      if (option.key === "sort_order") return null;

                                      return (
                                        <CustomMenu.MenuItem
                                          key={option.key}
                                          onClick={() => {
                                            setDisplayFilters({ order_by: option.key });
                                          }}
                                        >
                                          {option.name}
                                        </CustomMenu.MenuItem>
                                      );
                                    })}
                                  </CustomMenu>
                                </div>
                              </div>
                            </>
                          )}
                        <div className="flex items-center justify-between">
                          <h4 className="text-custom-text-200">Issue type</h4>
                          <div className="w-28">
                            <CustomMenu
                              label={
                                FILTER_ISSUE_OPTIONS.find(
                                  (option) => option.key === displayFilters?.type
                                )?.name ?? "Select"
                              }
                              className="!w-full"
                              buttonClassName="w-full"
                            >
                              {FILTER_ISSUE_OPTIONS.map((option) => (
                                <CustomMenu.MenuItem
                                  key={option.key}
                                  onClick={() =>
                                    setDisplayFilters({
                                      type: option.key,
                                    })
                                  }
                                >
                                  {option.name}
                                </CustomMenu.MenuItem>
                              ))}
                            </CustomMenu>
                          </div>
                        </div>

                        {displayFilters?.layout !== "calendar" &&
                          displayFilters?.layout !== "spreadsheet" && (
                            <>
                              <div className="flex items-center justify-between">
                                <h4 className="text-custom-text-200">Show empty states</h4>
                                <div className="w-28">
                                  <ToggleSwitch
                                    value={displayFilters?.show_empty_groups ?? true}
                                    onChange={() =>
                                      setDisplayFilters({
                                        show_empty_groups: !displayFilters?.show_empty_groups,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </>
                          )}
                      </div>

                      <div className="space-y-2 py-3">
                        <h4 className="text-sm text-custom-text-200">Display Properties</h4>
                        <div className="flex flex-wrap items-center gap-2 text-custom-text-200">
                          {Object.keys(properties).map((key) => {
                            if (key === "estimate" && !isEstimateActive) return null;

                            if (
                              displayFilters?.layout === "spreadsheet" &&
                              (key === "attachment_count" ||
                                key === "link" ||
                                key === "sub_issue_count")
                            )
                              return null;

                            if (
                              displayFilters?.layout !== "spreadsheet" &&
                              (key === "created_on" || key === "updated_on")
                            )
                              return null;

                            return (
                              <button
                                key={key}
                                type="button"
                                className={`rounded border px-2 py-1 text-xs capitalize ${
                                  properties[key as keyof Properties]
                                    ? "border-custom-primary bg-custom-primary text-white"
                                    : "border-custom-border-200"
                                }`}
                                onClick={() => setProperty(key as keyof Properties)}
                              >
                                {key === "key" ? "ID" : replaceUnderscoreIfSnakeCase(key)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </>
      )}
    </div>
  );
};
