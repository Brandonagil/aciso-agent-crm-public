import { BigQuery } from '@google-cloud/bigquery';

/** Server-side Google Cloud settings. No account or key file is bundled. */
export function getGoogleCloudProjectId(): string {
  const projectId = process.env.BQ_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('Set BQ_PROJECT_ID or GOOGLE_CLOUD_PROJECT before querying BigQuery.');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(projectId)) {
    throw new Error('The configured Google Cloud project ID is invalid.');
  }
  return projectId;
}

export function createBigQueryClient(): BigQuery {
  return new BigQuery({
    projectId: getGoogleCloudProjectId(),
    // If no key file is set, the SDK uses Application Default Credentials.
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  });
}

export function getBigQueryTable(dataset: string, table = 'mitglieder'): string {
  if (!/^[a-zA-Z0-9_]+$/.test(dataset) || !/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('The BigQuery dataset or table identifier is invalid.');
  }
  return `${getGoogleCloudProjectId()}.${dataset}.${table}`;
}

export async function getMemberDataset(client: BigQuery): Promise<string> {
  if (process.env.BQ_DATASET_ID) {
    getBigQueryTable(process.env.BQ_DATASET_ID);
    return process.env.BQ_DATASET_ID;
  }
  const [datasets] = await client.getDatasets();
  const datasetId = datasets.find(dataset =>
    dataset.id?.includes('churn') || dataset.id?.includes('prevention')
  )?.id || datasets[0]?.id;
  if (!datasetId) throw new Error('No BigQuery datasets found. Set BQ_DATASET_ID.');
  getBigQueryTable(datasetId);
  return datasetId;
}
