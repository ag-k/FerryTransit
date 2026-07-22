import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/update-jal-timetable.yml'),
  'utf8'
)

describe('JAL timetable workflow authentication', () => {
  it('uses short-lived GitHub OIDC credentials for the dedicated dev publisher', () => {
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain('uses: google-github-actions/auth@v3')
    expect(workflow).toContain(
      'projects/218069572477/locations/global/workloadIdentityPools/github-actions/providers/ferrytransit'
    )
    expect(workflow).toContain(
      'jal-timetable-publisher@oki-ferryguide-dev.iam.gserviceaccount.com'
    )
    expect(workflow).toContain('project_id: oki-ferryguide-dev')
  })

  it('does not restore the long-lived service account JSON secret flow', () => {
    expect(workflow).not.toContain('FIREBASE_SERVICE_ACCOUNT_DEV')
    expect(workflow).not.toContain('firebase-service-account.json')
    expect(workflow).not.toContain('secrets.')
  })
})
