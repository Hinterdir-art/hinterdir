// Buffer GraphQL API (public beta) – https://developers.buffer.com
import { requireEnv } from './config.mjs';

const API = 'https://api.buffer.com';

export async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireEnv('BUFFER_API_KEY')}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`Buffer API ${res.status}: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data;
}

export async function listChannels() {
  const { account } = await gql(`query { account { organizations { id name } } }`);
  const result = [];
  for (const org of account.organizations) {
    const { channels } = await gql(
      `query { channels(input: { organizationId: ${JSON.stringify(org.id)} }) { id name service } }`,
    );
    result.push({ org, channels });
  }
  return result;
}

const CREATE = `
mutation Create($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}`;

/**
 * Plant ein Video für eine Plattform ein.
 * platform: 'youtube' | 'tiktok' | 'instagram'
 */
export async function scheduleVideo({ platform, channelId, schedulingType, dueAt, videoUrl, text, meta, settings }) {
  const metadata = {};
  const ai = !!settings.ai_disclosure;
  if (platform === 'youtube') {
    const y = settings.platforms.youtube;
    metadata.youtube = {
      title: meta.title.slice(0, 100),
      categoryId: String(y.category_id),
      madeForKids: !!y.made_for_kids,
      privacy: y.privacy || 'public',
      isAiGenerated: ai,
    };
  } else if (platform === 'instagram') {
    metadata.instagram = {
      type: 'reel',
      shouldShareToFeed: settings.platforms.instagram.share_to_feed !== false,
      isAiGenerated: ai,
    };
  } else if (platform === 'tiktok') {
    metadata.tiktok = { isAiGenerated: ai };
  }

  const input = {
    channelId,
    text,
    schedulingType,            // 'automatic' | 'notification'
    mode: 'customScheduled',
    dueAt: dueAt.toISOString(),
    assets: [{ video: { url: videoUrl } }],
    metadata,
    needsApproval: false,
    source: 'hinterdir-pipeline',
    aiAssisted: true,
  };
  const data = await gql(CREATE, { input });
  const r = data.createPost;
  if (r.message) throw new Error(`Buffer (${platform}): ${r.message}`);
  return r.post;
}
