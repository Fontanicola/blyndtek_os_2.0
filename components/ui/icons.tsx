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
