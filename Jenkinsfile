pipeline {
    agent any

    environment {
        SERVER = 'ovh1.servers.jackz.me'
        DEPLOY_UI_PATH = '/var/www/admin.jackz.me.citest'
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
                    // sh '''
                    //     [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                    //     ssh-keyscan -t rsa,dsa example.com >> ~/.ssh/known_hosts
                    //     ssh user@example.com ...
                    // '''
                    sh 'ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} "mkdir -p \"/tmp/${JOB_NAME}\""'
                    sh 'scp -o StrictHostKeyChecking=no -r ui/dist/ deploy-jenkins@${SERVER}:"/tmp/${JOB_NAME}/"'
                    sh '''ssh -o StrictHostKeyChecking=no deploy-jenkins@${SERVER} 'rm -rf "${DEPLOY_UI_PATH}.old" && mv -T "${DEPLOY_UI_PATH}" "${DEPLOY_UI_PATH}.old"; mv -T "/tmp/${JOB_NAME}" "${DEPLOY_UI_PATH}"' '''
                }
            }
        }
    }
}


