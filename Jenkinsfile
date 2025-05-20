pipeline {
    agent {
        docker {
            image 'node:lts-bookworm'
        }
    }
    stages {
        stage('Build UI') { 
            steps {
                dir("ui") {
                    sh 'yarn install --frozen-lockfile' 
                    sh 'yarn build'
                    sh 'tar -cvf dist.tar.gz dist'
                    archiveArtifacts artifacts: 'dist.tar.gz', fingerprint: true
                }
            }
        }
        stage('Build Server') { 
            steps {
                dir("server") {
                    sh 'yarn install' 
                    sh 'yarn build'
                }
            }
        }
    }
}


