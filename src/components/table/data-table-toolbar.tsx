"use client"

import { type ComponentType } from "react"
import { type Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/table/data-table-view-options"

import { DataTableFacetedFilter } from "./data-table-faceted-filter"

type FacetedFilterOption = {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
}

type FacetedFilterConfig = {
  columnId: string
  title: string
  options: FacetedFilterOption[]
}

type SearchConfig = {
  columnId: string
  placeholder?: string
  inputClassName?: string
}

type PrimaryActionConfig = {
  label: string
  onClick?: () => void
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  search?: SearchConfig
  facetedFilters?: FacetedFilterConfig[]
  primaryAction?: PrimaryActionConfig
  showViewOptions?: boolean
}

export function DataTableToolbar<TData>({
  table,
  search,
  facetedFilters = [],
  primaryAction,
  showViewOptions = true,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const searchColumn = search?.columnId
    ? table.getColumn(search.columnId)
    : undefined

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        {searchColumn && (
          <Input
            placeholder={search?.placeholder ?? "Filter..."}
            value={(searchColumn.getFilterValue() as string) ?? ""}
            onChange={(event) => searchColumn.setFilterValue(event.target.value)}
            className={search?.inputClassName ?? "h-8 w-[150px] lg:w-[250px]"}
          />
        )}
        {facetedFilters.map((filter) => {
          const column = table.getColumn(filter.columnId)
          if (!column) {
            return null
          }
          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showViewOptions && <DataTableViewOptions table={table} />}
        {primaryAction && (
          <Button size="sm" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
