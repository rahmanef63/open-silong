import { lazy } from "react";
import {
  Table2, LayoutGrid, List as ListIcon, Image, Calendar as CalendarIcon, Clock,
  BarChart3, LayoutDashboard, Rss, Map as MapIcon, ClipboardList,
} from "lucide-react";
import type { DbView } from "@/shared/types/domain";

const TableView = lazy(() => import("../views/TableView").then((m) => ({ default: m.TableView })));
const BoardView = lazy(() => import("../views/BoardView").then((m) => ({ default: m.BoardView })));
const ListView = lazy(() => import("../views/ListView").then((m) => ({ default: m.ListView })));
const GalleryView = lazy(() => import("../views/GalleryView").then((m) => ({ default: m.GalleryView })));
const CalendarView = lazy(() => import("../views/CalendarView").then((m) => ({ default: m.CalendarView })));
const TimelineView = lazy(() => import("../views/TimelineView").then((m) => ({ default: m.TimelineView })));
const ChartView = lazy(() => import("../views/ChartView").then((m) => ({ default: m.ChartView })));
const DashboardView = lazy(() => import("../views/DashboardView").then((m) => ({ default: m.DashboardView })));
const FeedView = lazy(() => import("../views/FeedView").then((m) => ({ default: m.FeedView })));
const MapView = lazy(() => import("../views/MapView").then((m) => ({ default: m.MapView })));
const FormView = lazy(() => import("../views/FormView").then((m) => ({ default: m.FormView })));

export const VIEW_COMPONENTS: Record<DbView, any> = {
  table: TableView, board: BoardView, list: ListView, gallery: GalleryView,
  calendar: CalendarView, timeline: TimelineView,
  chart: ChartView, dashboard: DashboardView, feed: FeedView,
  map: MapView, form: FormView,
};

export const VIEW_META: Record<DbView, { icon: any; label: string }> = {
  table: { icon: Table2, label: "Table" },
  board: { icon: LayoutGrid, label: "Board" },
  list: { icon: ListIcon, label: "List" },
  gallery: { icon: Image, label: "Gallery" },
  calendar: { icon: CalendarIcon, label: "Calendar" },
  timeline: { icon: Clock, label: "Timeline" },
  chart: { icon: BarChart3, label: "Chart" },
  dashboard: { icon: LayoutDashboard, label: "Dashboard" },
  feed: { icon: Rss, label: "Feed" },
  map: { icon: MapIcon, label: "Map" },
  form: { icon: ClipboardList, label: "Form" },
};
