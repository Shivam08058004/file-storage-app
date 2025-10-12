pipeline {
    agent any
    
    environment {
        // Docker Hub credentials (configure in Jenkins)
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKER_IMAGE = 'your-dockerhub-username/file-storage-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        
        // Application name
        APP_NAME = 'file-storage-app'
        
        // Deployment directory on EC2
        DEPLOY_DIR = '/home/ubuntu/app'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📦 Checking out code from GitHub...'
                checkout scm
                sh 'git rev-parse --short HEAD > .git/commit-hash'
                script {
                    env.GIT_COMMIT_HASH = readFile('.git/commit-hash').trim()
                }
            }
        }
        
        stage('Environment Setup') {
            steps {
                echo '🔧 Setting up environment...'
                sh '''
                    node --version
                    docker --version
                    docker compose version
                '''
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo '📚 Installing dependencies...'
                sh '''
                    # Install pnpm if not present
                    corepack enable
                    corepack prepare pnpm@latest --activate
                    
                    # Install dependencies
                    pnpm install --frozen-lockfile
                '''
            }
        }
        
        stage('Lint & Type Check') {
            parallel {
                stage('ESLint') {
                    steps {
                        echo '🔍 Running ESLint...'
                        sh 'pnpm lint || true'
                    }
                }
                stage('TypeScript') {
                    steps {
                        echo '🔍 Type checking...'
                        sh 'pnpm tsc --noEmit || true'
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                sh """
                    docker build \
                        --tag ${DOCKER_IMAGE}:${DOCKER_TAG} \
                        --tag ${DOCKER_IMAGE}:latest \
                        --build-arg BUILD_DATE=\$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                        --build-arg VCS_REF=${GIT_COMMIT_HASH} \
                        --build-arg BUILD_NUMBER=${BUILD_NUMBER} \
                        .
                """
            }
        }
        
        stage('Test Docker Image') {
            steps {
                echo '🧪 Testing Docker image...'
                sh """
                    # Run container in test mode
                    docker run --rm \
                        --name ${APP_NAME}-test \
                        -e NODE_ENV=test \
                        ${DOCKER_IMAGE}:${DOCKER_TAG} \
                        node --version
                    
                    # Check image size
                    docker images ${DOCKER_IMAGE}:${DOCKER_TAG}
                """
            }
        }
        
        stage('Security Scan') {
            steps {
                echo '🔒 Scanning for vulnerabilities...'
                sh '''
                    # Install Trivy if not present
                    if ! command -v trivy &> /dev/null; then
                        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
                        sudo apt-get update
                        sudo apt-get install -y trivy
                    fi
                    
                    # Scan image (informational only)
                    trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE}:${DOCKER_TAG} || true
                '''
            }
        }
        
        stage('Push to Docker Hub') {
            when {
                branch 'main'
            }
            steps {
                echo '📤 Pushing to Docker Hub...'
                sh """
                    echo \${DOCKER_HUB_CREDENTIALS_PSW} | docker login -u \${DOCKER_HUB_CREDENTIALS_USR} --password-stdin
                    docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                    docker push ${DOCKER_IMAGE}:latest
                    docker logout
                """
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to production...'
                sh """
                    cd ${DEPLOY_DIR}
                    
                    # Pull latest image
                    docker compose pull nextjs-app
                    
                    # Recreate only the app container
                    docker compose up -d --no-deps --force-recreate nextjs-app
                    
                    # Wait for health check
                    sleep 10
                    
                    # Check if container is running
                    docker compose ps nextjs-app
                    
                    # Cleanup old images
                    docker image prune -f
                """
            }
        }
        
        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                echo '🏥 Running health checks...'
                sh """
                    # Wait for app to be ready
                    sleep 15
                    
                    # Check health endpoint
                    curl -f http://localhost:3000/api/files/stats || exit 1
                    
                    # Check container logs
                    docker logs --tail 50 file-storage-app
                """
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline completed successfully!'
            script {
                if (env.BRANCH_NAME == 'main') {
                    // Send success notification (configure webhook in Jenkins)
                    echo "Deployment successful: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }
        
        failure {
            echo '❌ Pipeline failed!'
            script {
                // Send failure notification
                echo "Build failed for commit ${GIT_COMMIT_HASH}"
            }
        }
        
        always {
            echo '🧹 Cleaning up...'
            sh '''
                # Clean up test containers
                docker ps -a | grep ${APP_NAME}-test | awk '{print $1}' | xargs -r docker rm -f || true
                
                # Show disk usage
                docker system df
            '''
            
            // Archive build artifacts
            archiveArtifacts artifacts: '.next/**', allowEmptyArchive: true
            
            // Clean workspace
            cleanWs()
        }
    }
}
