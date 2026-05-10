import {
  extractVideoId,
  getChannelVideos,
  getVideoInfo,
  transcribeAndIngest,
  type TranscriptResult,
} from '@/lib/youtube/transcript';

type JobStatus = 'queued' | 'running' | 'success' | 'partial' | 'failed';
type JobKind = 'video' | 'channel';

export type YouTubeRagJob = {
  id: string;
  kind: JobKind;
  inputUrl: string;
  videoId?: string;
  channelUrl?: string;
  title?: string;
  category: string;
  limit?: number;
  status: JobStatus;
  progress: string;
  totalVideos: number;
  processedVideos: number;
  successVideos: number;
  totalChunks: number;
  error?: string;
  results: TranscriptResult[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

type JobState = {
  jobs: Map<string, YouTubeRagJob>;
  queue: string[];
  active: number;
};

const globalState = globalThis as typeof globalThis & {
  __fieliaYoutubeRagJobs?: JobState;
};

const state: JobState = globalState.__fieliaYoutubeRagJobs || {
  jobs: new Map<string, YouTubeRagJob>(),
  queue: [],
  active: 0,
};

globalState.__fieliaYoutubeRagJobs = state;

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `yt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function concurrency() {
  const configured = Number.parseInt(process.env.YOUTUBE_RAG_JOB_CONCURRENCY || '2', 10) || 2;
  return Math.max(1, Math.min(4, configured));
}

function touch(job: YouTubeRagJob, patch: Partial<YouTubeRagJob>) {
  Object.assign(job, patch, { updatedAt: nowIso() });
}

function publicJob(job: YouTubeRagJob): YouTubeRagJob {
  return { ...job, results: [...job.results] };
}

function pruneJobs() {
  const jobs = Array.from(state.jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const job of jobs.slice(100)) {
    if (job.status !== 'running' && job.status !== 'queued') {
      state.jobs.delete(job.id);
    }
  }
}

async function runVideoJob(job: YouTubeRagJob) {
  const videoId = job.videoId || extractVideoId(job.inputUrl);
  if (!videoId) {
    throw new Error('URL de video invalida');
  }

  touch(job, { videoId, totalVideos: 1, progress: 'Buscando titulo do video...' });
  const videoInfo = await getVideoInfo(videoId);

  touch(job, {
    title: job.title || videoInfo.title,
    progress: 'Transcrevendo e adicionando ao RAG...',
  });

  const result = await transcribeAndIngest(videoId, job.title || videoInfo.title, job.category);
  touch(job, {
    processedVideos: 1,
    successVideos: result.success ? 1 : 0,
    totalChunks: result.chunks,
    results: [result],
  });

  if (!result.success) {
    throw new Error(result.error || 'Falha na transcricao');
  }
}

async function runChannelJob(job: YouTubeRagJob) {
  const limit = Math.max(1, Math.min(20, job.limit || 5));
  touch(job, { limit, progress: 'Listando videos recentes do canal...' });

  const videos = await getChannelVideos(job.channelUrl || job.inputUrl, limit);
  if (videos.length === 0) {
    throw new Error('Nenhum video encontrado no canal');
  }

  touch(job, {
    totalVideos: videos.length,
    progress: `0/${videos.length} videos transcritos`,
  });

  const results: TranscriptResult[] = [];
  let successVideos = 0;
  let totalChunks = 0;

  for (const [index, video] of videos.entries()) {
    touch(job, {
      progress: `Transcrevendo ${index + 1}/${videos.length}: ${video.title}`,
    });

    const result = await transcribeAndIngest(video.id, video.title, job.category);
    results.push(result);
    if (result.success) successVideos++;
    totalChunks += result.chunks;

    touch(job, {
      processedVideos: index + 1,
      successVideos,
      totalChunks,
      results: [...results],
      progress: `${index + 1}/${videos.length} videos processados`,
    });
  }

  if (successVideos === 0) {
    throw new Error('Nenhum video foi transcrito com sucesso');
  }
}

async function runJob(job: YouTubeRagJob) {
  touch(job, {
    status: 'running',
    startedAt: nowIso(),
    progress: 'Iniciando processamento...',
  });

  try {
    if (job.kind === 'video') {
      await runVideoJob(job);
    } else {
      await runChannelJob(job);
    }

    touch(job, {
      status: job.successVideos === job.totalVideos ? 'success' : 'partial',
      progress: `${job.successVideos}/${job.totalVideos} videos transcritos. ${job.totalChunks} chunks criados.`,
      completedAt: nowIso(),
    });
  } catch (error) {
    touch(job, {
      status: job.successVideos > 0 ? 'partial' : 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      progress: job.successVideos > 0
        ? `${job.successVideos}/${job.totalVideos || 1} videos transcritos com falhas.`
        : 'Falha na transcricao.',
      completedAt: nowIso(),
    });
  }
}

function drainQueue() {
  while (state.active < concurrency() && state.queue.length > 0) {
    const id = state.queue.shift();
    if (!id) continue;
    const job = state.jobs.get(id);
    if (!job || job.status !== 'queued') continue;

    state.active++;
    void runJob(job).finally(() => {
      state.active--;
      pruneJobs();
      drainQueue();
    });
  }
}

export function enqueueYouTubeRagJob(input: {
  kind: JobKind;
  inputUrl: string;
  videoId?: string;
  channelUrl?: string;
  title?: string;
  category?: string;
  limit?: number;
}) {
  const createdAt = nowIso();
  const job: YouTubeRagJob = {
    id: makeId(),
    kind: input.kind,
    inputUrl: input.inputUrl,
    videoId: input.videoId,
    channelUrl: input.channelUrl,
    title: input.title,
    category: input.category || 'general',
    limit: input.limit,
    status: 'queued',
    progress: 'Aguardando vaga na fila...',
    totalVideos: input.kind === 'video' ? 1 : 0,
    processedVideos: 0,
    successVideos: 0,
    totalChunks: 0,
    results: [],
    createdAt,
    updatedAt: createdAt,
  };

  state.jobs.set(job.id, job);
  state.queue.push(job.id);
  drainQueue();

  return publicJob(job);
}

export function listYouTubeRagJobs(limit = 30) {
  const jobs = Array.from(state.jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(100, limit)))
    .map(publicJob);

  return {
    jobs,
    summary: {
      queued: jobs.filter((job) => job.status === 'queued').length,
      running: jobs.filter((job) => job.status === 'running').length,
      success: jobs.filter((job) => job.status === 'success').length,
      partial: jobs.filter((job) => job.status === 'partial').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      active: state.active,
      concurrency: concurrency(),
    },
  };
}
