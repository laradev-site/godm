import { Translations } from '../types';

export const ko: Translations = {
  // Toolbar
  addUrl: 'URL 추가',
  resume: '이어받기',
  stop: '일시정지',
  stopAll: '모두 일시정지',
  delete: '삭제',
  openFile: '파일 열기',
  folder: '폴더 열기',
  threads: '스레드 보기',
  extension: '브라우저 확장',
  searchPlaceholder: '다운로드 검색...',
  language: '언어 (Language)',

  // Sidebar Categories
  categories: '카테고리',
  allDownloads: '전체 다운로드',
  compressed: '압축 파일',
  documents: '문서',
  music: '음악 및 오디오',
  programs: '프로그램',
  video: '동영상 및 비디오',

  // Sidebar Status
  status: '상태',
  downloading: '다운로드 중',
  paused: '일시 중단됨',
  completed: '완료됨',
  error: '오류 발생',

  // Table Headers
  fileName: '파일 이름',
  size: '파일 크기',
  progress: '진행률',
  speed: '다운로드 속도',
  timeLeft: '남은 시간',
  connections: '스레드',

  // Inspector Panel
  downloadThreadsTitle: '다운로드 스레드 및 분할 청크',
  activeSegmentation: '활성 동적 세그먼트: {count}개 병렬 연결',
  threadCol: '스레드',
  byteOffsetCol: '바이트 범위',
  downloadedTotalCol: '다운로드 / 전체 크기',
  statusCol: '상태',
  connectionNum: '연결 #{num}',
  finished: '완료',
  active: '전송 중',
  idle: '대기 중',
  saveTo: '저장 위치',

  // Status Bar
  downloadsTotal: '총 {count}개 다운로드',
  activeCount: '{count}개 진행 중',
  completedCount: '{count}개 완료',

  // Add Download Modal
  enterDownloadUrl: '다운로드 URL 입력',
  urlPlaceholder: '다운로드 링크 붙여넣기 (HTTP, HTTPS, YouTube, TikTok 등)',
  inspecting: '미디어 및 서버 정보 확인 중...',
  saveFolder: '저장 폴더',
  browse: '찾아보기...',
  filenameOnDisk: '디스크에 저장할 파일 이름',
  parallelThreads: '동시 병렬 연결 (스레드)',
  selectQuality: '화질 및 해상도 선택',
  startDownload: '다운로드 시작',
  cancel: '취소',
  videoDetected: '온라인 동영상 / 오디오 감지됨',

  // Extension Modal
  extensionGuideTitle: '브라우저 확장 프로그램 설치 가이드',
  step1: '브라우저에서 확장 프로그램 페이지를 엽니다 (chrome://extensions 또는 edge://extensions)',
  step2: '우측 상단의 "개발자 모드"를 활성화합니다',
  step3: '"압축해제된 확장 프로그램을 로드합니다"를 클릭하고 아래 폴더를 선택하세요',
  extensionPathLabel: '확장 프로그램 폴더 경로',
  copyPath: '경로 복사',
  copied: '복사 완료!',
  openExtensionFolder: '확장 폴더 열기',
  close: '닫기',

  // Alerts & Messages
  errorStarting: '다운로드 시작 중 오류 발생',
  failedInspect: 'URL 확인 실패',
  confirmDelete: '이 다운로드 작업을 삭제하시겠습니까?',
};
