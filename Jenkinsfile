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
                    env.BRANCH_NAME == "master" || env.BRANCH_NAME == "release"
                }
                expression {
                    currentBuild.result == null || currentBuild.result == 'SUCCESS'  
                }
            }
            environment {
                DEST_UI = '${DEPLOY_UI_PATH}/${env.BRANCH_NAME}'
                DEST_SERVER = '${DEPLOY_SERVER_PATH}/${env.BRANCH_NAME}'
            }
            steps {
               
                sh 'ssh-keyscan -t rsa ${SERVER} >> ~/.ssh/known_hosts'
                sh 'echo $BRANCH_NAME $JOB_NAME'
                sh 'echo ${env.DEST_UI} ${env.DEST_SERVER}'
                // Deploy UI
                sshagent(credentials: ['deploy-ssh']) {
                    // Deploy to temp dir, once transferred swap live /var/www
                    // Can't just rsync as the file names change to bypass cache
                    sh 'ssh deploy-jenkins@${SERVER} "mkdir -p \"/tmp/jenkins/${JOB_NAME}-${BRANCH_NAME}\""'
                    sh 'scp -r ui/dist/* deploy-jenkins@${SERVER}:"/tmp/jenkins/${JOB_NAME}-${BRANCH_NAME}/"'
                    sh """ssh deploy-jenkins@${SERVER} 'set -e; rm -rf "${env.DEST_UI}" && mv -T "${env.DEST_UI}" "${env.DEST_UI}.old"; mkdir -p "${env.DEST_UI}"; mv -T "/tmp/jenkins/${JOB_NAME}-${env.BRANCH_NAME}" "${env.DEST_UI}"' """
                }
                // Deploy Server
                sshagent(credentials: ['deploy-ssh']) {
                    // Deploy to ${DEPLOY_SERVER_PATH}/dist, and rsync as server files should always be the same
                    sh 'ssh deploy-jenkins@${SERVER} "mkdir -p \"${env.DEST_SERVER}\"/dist"'
                    sh 'rsync -r server/dist/* deploy-jenkins@${SERVER}:"${env.DEST_SERVER}/dist"'
                    sh 'ssh deploy-jenkins@${SERVER} "sudo systemctl restart ${DEPLOY_SERVER_SERVICE_NAME}-${env.BRANCH_NAME}"'
                }
            }
        }
    }
}


