<template>

</template>

<script setup lang="ts">

enum DownloadState {
  Idle,
  Downloading,
  PromptRedownload,
  RestartingServers,
  Done
}

const downloadState = ref<DownloadState>(DownloadState.Idle)
const downloadLog = ref<{state: string, message: string, error?: boolean, success?: boolean, filename?: string}[]>([])
const downloads = ref<Record<string, { entryTitle: string, url: string, totalBytes: number, currentBytes: number, progress: number }>>({})

function startDownload(force = false) {
  downloadState.value = DownloadState.Downloading
  downloadLog.value = []
  const start = Date.now()
  const query = new URLSearchParams();
  query.append("destinations", installDestinations.value.join(','))
  query.append("sse", "1")
  if(force) query.append("force", "1")
  if(acceptedChildren.value != null) query.append("children", acceptedChildren.value.join(','))
  const sse = new EventSource(`/api/shares/${props.share.id}/addons/workshop/${workshopId.value}/download?${query.toString()}`)
  // Don't care about see.onerror, will trigger when server closes
  sse.onerror = () => {
    downloadLog.value.push({
      state: "SERVER_ERROR",
      message: "Lost connection with server, please try again.",
      error: true
    })
    sse.close()
  }
  sse.addEventListener('message', event => {
    try {
      const payload = JSON.parse(event.data)
      if(payload.error) {
        if(payload.code === "FILE_EXISTS") {
          console.debug("File already exist, asking for confirmation")
          sse.close()
          downloadState.value = DownloadState.PromptRedownload
          downloadLog.value.push({
            state: payload.state || payload.code,
            filename: payload.filename,
            message: "Addon was already downloaded. Press the redownload button to download a fresh version",
            error: true
          })
        } else {
          downloadLog.value.push({
            state: payload.state || payload.code,
            message: payload.message,
            error: true
          })
        }
      } else if(payload.state === "COMPLETE") {
        sse.close()
        downloadLog.value.push({
          state: "DONE",
          message: `Took ${Math.round((Date.now() - start) / 1000)} seconds. Maps will not be playable until the server(s) have restarted. You can restart individual servers from the 'Server Management' page.`
        })
        // If no force prompt shown or this was a force download, then we are done.
        if(downloadState.value == DownloadState.Downloading || force) downloadState.value = DownloadState.Done
        else console.debug("COMPLETE on state=",downloadState.value)

      } else if(payload.state === "DOWNLOAD_PROGRESS") {
        if(!downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`)
        downloads.value[payload.entry]!.currentBytes = payload.currentBytes
        downloads.value[payload.entry]!.progress = payload.progress
      } else if(payload.state === "DOWNLOADING") {
        downloads.value[payload.entry] = {
          ...payload,
          url: getWorkshopUrl(payload.entry)
        }
      } else {
        if(payload.state === "DOWNLOADED") {
          if(!downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`)
          downloads.value[payload.entry]!.progress = 1
          downloads.value[payload.entry].currentBytes = downloads.value[payload.entry].totalBytes
        }

        downloadLog.value.push({
          state: payload.state || payload.code,
          message: payload.message,
          success: payload.state == "SUCCESS"
        })
      }
    } catch(err) {
      console.warn("Got invalid json payload: ", err, " data: ", event.data)
    }
  });
}
</script>
