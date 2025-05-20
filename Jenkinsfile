pipeline {
    agent {
        docker {
            image 'node:lts-buster-slim'
        }
    }
    stages {
        stage('Build') { 
            steps {
                dir("ui") {
                    sh 'yarn install' 
                }
            }
        }
    }
}


