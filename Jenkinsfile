

pipeline {
    agent any
    stages {
        stage('Build') { 
            steps {
                dir("ui") {
                    sh 'npm install' 
                }
            }
        }
    }
}


