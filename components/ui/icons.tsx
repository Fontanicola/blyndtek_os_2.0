import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  CornerDownLeft,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  File,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Filter,
  Folder,
  FolderOpen,
  Grid2x2,
  Globe,
  Image,
  Inbox,
  Layers,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  List,
  ListTodo,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  MoreVertical,
  MoreHorizontal,
  Pause,
  Play,
  Pencil,
  Phone,
  Pin,
  Plus,
  RefreshCw,
  Server,
  Search,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Wallet,
  Wrench,
  Zap,
  X
} from "lucide-react";

type IconComponent = ReturnType<typeof forwardRef<SVGSVGElement, LucideProps>>;

function createIcon(Icon: LucideIcon, defaultSize = 20): IconComponent {
  return forwardRef<SVGSVGElement, LucideProps>(function IconComponent(
    { size = defaultSize, strokeWidth = 1.5, ...props },
    ref
  ) {
    return <Icon ref={ref} size={size} strokeWidth={strokeWidth} {...props} />;
  });
}

export const BlyndtekIsotipoIcon = forwardRef<SVGSVGElement, LucideProps>(
  function BlyndtekIsotipoIcon({ size = 20, ...props }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 365 360"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
        {...props}
      >
        <path
          fill="currentColor"
          d="M195.91,19.91l-58.8,103.2-117.9-.31s3.37-10.41,5.82-14.09,40.42-69.52,40.42-69.52c0,0,6.74-8.57,7.96-9.49l15.31-8.88s11.02-2.14,13.47-1.84,84.22-.92,84.22-.92c0,0,5.82.61,7.66,1.22s-1.84-18.68-1.84-18.68l-96.47-.61s-33.69,5.82-44.4,26.03C40.64,46.24,5.73,105.97,5.73,105.97c0,0-11.33,26.64-2.14,47.47,9.19,20.83,48.69,85.44,48.69,85.44,0,0,17.76,22.97,38.59,24.5,20.82,1.53,96.77.61,96.77.61,0,0,31.85-.92,46.55-28.17l44.1-75.95s14.09-28.17.31-54.82c-13.78-26.64-46.55-80.23-46.55-80.23l-20.82,4.59s7.04,6.74,10.11,12.56c3.06,5.82,41.04,70.13,41.04,70.13,0,0,11.33,17.15-.31,40.12-11.64,22.97-45.32,77.17-45.32,77.17,0,0-7.35,13.47-26.34,16.23-18.99,2.76-93.71.92-93.71.92,0,0-18.68-3.67-28.79-16.54l-45.94-80.54s-1.84-5.82-2.45-8.27h117.29l57.88,99.22,15.62-8.57-57.57-99.53,56.96-99.53-13.78-12.86Z"
        />
        <path
          fill="currentColor"
          d="M192.24.61s26.58,4.2,39.81,24.19l-1.33,9.78-19.5-5.19-2.25,4.24-13.06-13.73-1.84-.61-5.15-10.99,3.31-7.69Z"
        />
        <polygon
          fill="currentColor"
          points="193.26 238.19 198.63 246.76 214.89 238.05 209.37 229.92 193.26 238.19"
        />
      </svg>
    );
  }
);

export type { LucideProps as IconProps };

export const AlertTriangleIcon = createIcon(AlertTriangle);
export const ArrowLeftIcon = createIcon(ArrowLeft);
export const ArrowDownLeftIcon = createIcon(ArrowDownLeft);
export const ArrowRightIcon = createIcon(ArrowRight);
export const ArrowUpRightIcon = createIcon(ArrowUpRight);
export const BarChartIcon = createIcon(BarChart3);
export const BellIcon = createIcon(Bell);
export const BookOpenIcon = createIcon(BookOpen);
export const BotIcon = createIcon(Bot);
export const BrainIcon = createIcon(Brain);
export const BriefcaseIcon = createIcon(Briefcase);
export const CalendarIcon = createIcon(CalendarDays);
export const CheckIcon = createIcon(Check);
export const CheckCircleIcon = createIcon(CheckCircle2);
export const ChevronDownIcon = createIcon(ChevronDown);
export const ChevronRightIcon = createIcon(ChevronRight);
export const ClockIcon = createIcon(Clock3);
export const CopyIcon = createIcon(Copy);
export const CornerDownLeftIcon = createIcon(CornerDownLeft);
export const DollarSignIcon = createIcon(DollarSign);
export const DownloadIcon = createIcon(Download);
export const EyeIcon = createIcon(Eye);
export const EyeOffIcon = createIcon(EyeOff);
export const FileIcon = createIcon(File);
export const FileSpreadsheetIcon = createIcon(FileSpreadsheet);
export const FileTextIcon = createIcon(FileText);
export const FingerprintIcon = createIcon(Fingerprint);
export const FilterIcon = createIcon(Filter);
export const FolderIcon = createIcon(Folder);
export const FolderOpenIcon = createIcon(FolderOpen);
export const GridIcon = createIcon(Grid2x2);
export const GlobeIcon = createIcon(Globe);
export const ImageIcon = createIcon(Image);
export const InboxIcon = createIcon(Inbox);
export const LayersIcon = createIcon(Layers);
export const LandmarkIcon = createIcon(Landmark);
export const DashboardIcon = createIcon(LayoutDashboard);
export const ProyectosIcon = createIcon(LayoutGrid);
export const LinkIcon = createIcon(Link2);
export const ListIcon = createIcon(List);
export const TareasIcon = createIcon(ListTodo);
export const LoaderIcon = createIcon(Loader2);
export const LogoutIcon = createIcon(LogOut);
export const MailIcon = createIcon(Mail);
export const MenuIcon = createIcon(Menu);
export const MegaphoneIcon = createIcon(Megaphone);
export const MoreVerticalIcon = createIcon(MoreVertical);
export const MoreHorizontalIcon = createIcon(MoreHorizontal);
export const PauseIcon = createIcon(Pause);
export const PlayIcon = createIcon(Play);
export const PencilIcon = createIcon(Pencil);
export const PhoneIcon = createIcon(Phone);
export const PinIcon = createIcon(Pin);
export const PlusIcon = createIcon(Plus);
export const RefreshIcon = createIcon(RefreshCw);
export const ServerIcon = createIcon(Server);
export const SearchIcon = createIcon(Search);
export const SettingsIcon = createIcon(Settings2);
export const SparklesIcon = createIcon(Sparkles);
export const TagsIcon = createIcon(Tags);
export const TrashIcon = createIcon(Trash2);
export const TrendingUpIcon = createIcon(TrendingUp);
export const UploadIcon = createIcon(Upload);
export const UserIcon = createIcon(User);
export const UsersIcon = createIcon(Users);
export const WalletIcon = createIcon(Wallet);
export const WrenchIcon = createIcon(Wrench);
export const ZapIcon = createIcon(Zap);
export const XIcon = createIcon(X);

// Legacy semantic aliases used throughout the app
export const AgentesIcon = BotIcon;
export const ArchivosIcon = FolderIcon;
export const CalendarioIcon = CalendarIcon;
export const ClientesIcon = UsersIcon;
export const FinanzasIcon = TrendingUpIcon;
export const InboundIcon = ArrowDownLeftIcon;
export const NotasIcon = FileTextIcon;
export const OutboundIcon = ArrowUpRightIcon;
export const SaasIcon = GridIcon;
export const WikiIcon = BookOpenIcon;
