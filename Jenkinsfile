pipeline {
    agent none

    environment {
        SERVER = 'ovh1'
        DEPLOY_UI_PATH = '/var/www/admin.jackz.me.citest'
    }

    stages {
        stage("Build") {
            parallel {
                stage('Build UI') { 
                    agent {
                        docker {
                            image 'node:lts-bookworm'
                        }
                    }
                    steps {
                        dir("ui") {
                            sh 'yarn install --frozen-lockfile' 
                            sh 'yarn build'
                        }
                    }
                    post success {
                        dir("ui") {
                            sh 'tar -cvf web.tar.gz dist/*'
                            archiveArtifacts artifacts: 'web.tar.gz', fingerprint: true
                        }
                    }
                }
                stage('Build Server') { 
                    agent {
                        docker {
                            image 'node:lts-bookworm'
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
            agent {
                docker {
                    image 'node:lts-bookworm'
                }
                steps {
                    sshagent(credentials: ['deploy']) {
                        // sh '''
                        //     [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                        //     ssh-keyscan -t rsa,dsa example.com >> ~/.ssh/known_hosts
                        //     ssh user@example.com ...
                        // '''
                        sh 'scp -r ui/dist/ deploy-jenkins@${SERVER}:/tmp/${BUILD_TAG}/'
                        sh 'ssh -o StrictHostKeyChecking=no -l deploy-jenkins@ovh1 ls /tmp/${BUILD_TAG}'
                    }
                }
            }
        }
    }
}


