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
                sh 'ssh-keyscan -t rsa ${SERVER} >> ~/.ssh/known_hosts'
                sshagent(credentials: ['deploy-ssh']) {
                    // Deploy to temp dir, once transferred swap live /var/www
                    // Can't just rsync as the file names change to bypass cache
                    sh 'ssh deploy-jenkins@${SERVER} "mkdir -p \"/tmp/jenkins/${JOB_NAME}\""'
                    sh 'scp -r ui/dist/* deploy-jenkins@${SERVER}:"/tmp/jenkins/${JOB_NAME}/"'
                    sh """ssh deploy-jenkins@${SERVER} 'set -e; rm -rf "${DEPLOY_UI_PATH}.old" && mv -T "${DEPLOY_UI_PATH}" "${DEPLOY_UI_PATH}.old"; mkdir "${DEPLOY_UI_PATH}"; mv -T "/tmp/jenkins/${JOB_NAME}" "${DEPLOY_UI_PATH}"' """
                }
                sshagent(credentials: ['deploy-ssh']) {
                    // Deploy to ${DEPLOY_SERVER_PATH}/dist, and rsync as server files should always be the same
                    sh 'ssh deploy-jenkins@${SERVER} "mkdir -p \"${DEPLOY_SERVER_PATH}\"/dist"'
                    sh 'rsync -r server/dist/* deploy-jenkins@${SERVER}:"${DEPLOY_SERVER_PATH}/dist"'
                    sh 'ssh deploy-jenkins@${SERVER} "sudo systemctl restart ${DEPLOY_SERVER_SERVICE_NAME}"'
                }
            }
        }
    }
}


