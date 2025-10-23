import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRotateRight, 
  faCheck, 
  faTimes, 
  faExclamationTriangle,
  faSpinner,
  faGamepad,
  faHandRock,
  faHandPaper,
  faHandScissors,
  faHandLizard,
  faHandSpock,
  faTrophy,
  faHeart,
  faSadTear,
  faHandshake,
  faClock,
  faEye,
  faEyeSlash,
  faCopy,
  faExternalLinkAlt,
  faInfoCircle,
  faWarning,
  faCheckCircle,
  faTimesCircle,
  faSpinner as faSpinnerSolid
} from '@fortawesome/free-solid-svg-icons';

export const Icons = {
  refresh: faRotateRight,
  check: faCheck,
  times: faTimes,
  warning: faExclamationTriangle,
  spinner: faSpinner,
  game: faGamepad,
  rock: faHandRock,
  paper: faHandPaper,
  scissors: faHandScissors,
  lizard: faHandLizard,
  spock: faHandSpock,
  trophy: faTrophy,
  heart: faHeart,
  sad: faSadTear,
  handshake: faHandshake,
  clock: faClock,
  eye: faEye,
  eyeSlash: faEyeSlash,
  copy: faCopy,
  externalLink: faExternalLinkAlt,
  info: faInfoCircle,
  warningCircle: faWarning,
  checkCircle: faCheckCircle,
  timesCircle: faTimesCircle,
  spinnerSolid: faSpinnerSolid
};

export function Icon({ name, className = "", ...props }: { name: keyof typeof Icons; className?: string; [key: string]: any }) {
  return <FontAwesomeIcon icon={Icons[name]} className={className} {...props} />;
}


