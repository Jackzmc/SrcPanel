import { exec } from 'node:child_process'
import { parse } from 'semver'
/**
 * Gets the current version of panel based off current git branch. 
 * This can be a tag (v1.0.0, 'feat-my-branch', or branch like 'master')
 * 
 * Puls from GIT_BRANCH and fallsback to git (for dev)
 */
export async function getPanelBranchVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        if(process.env.GIT_BRANCH) return resolve(process.env.GIT_BRANCH)
        exec("git rev-parse --abbrev-ref HEAD", (err, output) => {
            if(err) return reject(err)
            resolve(output.trim())
        })
    })
}


/**
 * Gets the current version of panel or null. 
 * Returns in semver format (major.minor.patch) with no prefix
 */
export async function getPanelVersion(): Promise<string | null> {
  const branchVersion = await getPanelBranchVersion()
  const result = parse(branchVersion)
  if(!result) return null
  return `${result.major}.${result.minor ?? 0}`
}

export const USER_AGENT = `SrcPanel/${(await getPanelVersion()) ?? '2'} (+https://codeberg.com/jackzmc/srcpanel)`

