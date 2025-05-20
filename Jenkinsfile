pipeline {
    agent any

    environment {
        SERVER = 'ovh1.servers.jackz.me'
        DEPLOY_UI_PATH = '/var/www/admin.jackz.me.citest'
        DEPLOY_SERVER_PATH = '/node/admin-panel'
        DEPLOY_SERVER_SERVICE_NAME = 'admin-panel'
    }

    stages {
        stage("Build") {
            parallel {
                stage('Build UI') { 
                    agent {
                        docker {
                            image 'node:lts-bookworm'
                            reuseNode true
                        }
                    }
                    steps {
                        dir("ui") {
                            sh 'yarn install --frozen-lockfile' 
                            sh 'yarn build'
                            sh 'tar -cvf web.tar.gz dist/*'
                        }
                    }
                    post {
                        success {
                            dir("ui") {
                                archiveArtifacts artifacts: 'web.tar.gz', fingerprint: true
                            }
                        }
                       
                    }
                }
                stage('Build Server') { 
                    agent {
                        docker {
                            image 'node:lts-bookworm'
                            reuseNode true
                        }
                    }
                    steps {
                        dir("server") {
                            sh 'yarn install --frozen-lockfile' 
                            sh 'yarn build'
                            sh 'tar -cvf server.tar.gz dist/*'
                        }
                    }
                    post {
                        success {
                            dir("server") {
                                archiveArtifacts artifacts: 'server.tar.gz', fingerprint: true
                            }
                        }
                       
                    }
                }
            }
        }
        stage("Deploy") {
            when {
              expression {
                currentBuild.result == null || currentBuild.result == 'SUCCESS' 
              }
            }
            steps {
                sshagent(credentials: ['deploy-ssh']) {
                    sh 'ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} "mkdir -p \"/tmp/jenkins/${JOB_NAME}\""'
                    sh 'scp -o StrictHostKeyChecking=no -r ui/dist/* deploy-jenkins@${SERVER}:"/tmp/jenkins/${JOB_NAME}/"'
                    sh """ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} 'set -e; rm -rf "${DEPLOY_UI_PATH}.old" && mv -T "${DEPLOY_UI_PATH}" "${DEPLOY_UI_PATH}.old"; mkdir "${DEPLOY_UI_PATH}"; mv -T "/tmp/jenkins/${JOB_NAME}" "${DEPLOY_UI_PATH}"' """
                }
                sshagent(credentials: ['deploy-ssh']) {
                    sh 'ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} "mkdir -p \"${DEPLOY_SERVER_PATH}\""'
                    sh 'scp -o StrictHostKeyChecking=no -r server/dist/* deploy-jenkins@${SERVER}:"${DEPLOY_SERVER_PATH}"'
                    sh 'ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} "systemctl restart ${DEPLOY_SERVER_SERVICE_NAME}"'
                }
            }
        }
    }
}


