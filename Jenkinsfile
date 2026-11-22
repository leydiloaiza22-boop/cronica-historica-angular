// =========================================================
// CRÓNICA HISTÓRICA - Pipeline de integración continua (Jenkins)
//
//   Checkout -> Test (ruff + pytest en contenedor efímero)
//            -> Preparar entorno -> Build (2 imágenes)
//            -> Prueba de humo e integración -> Escaneo de seguridad -> post
//
// - Se dispara solo: Jenkins revisa GitHub cada 2 minutos (Poll SCM).
// - Las claves vienen de las CREDENCIALES de Jenkins (creadas por
//   Configuration as Code a partir de jenkins/.env), nunca del código.
// - Si una prueba falla, el pipeline se detiene: el código defectuoso
//   nunca llega a convertirse en imagen.
// =========================================================

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        // Poll SCM: revisa el repositorio cada 2 minutos y construye si hay commits nuevos
        pollSCM('H/2 * * * *')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'cronica-historica'
        // Credenciales "Secret text" guardadas en Jenkins (se enmascaran en la consola)
        SECRET_KEY    = credentials('cronica-secret-key')
        DEMO_PASSWORD = credentials('cronica-demo-password')
    }

    stages {

        stage('Checkout') {
            steps {
                // Descarga el código del commit que disparó el build
                checkout scm
                sh '''
                    echo "Commit: $(git log -1 --pretty='%h - %s (%an)')"
                    docker version --format 'Docker {{.Server.Version}}'
                    docker compose version
                '''
            }
        }

        stage('Test') {
            // Contenedor Docker EFÍMERO solo para las pruebas (plugin Docker Pipeline):
            // Jenkins lo crea con python:3.12-slim y lo elimina al terminar la etapa
            agent {
                docker {
                    image 'python:3.12-slim'
                    reuseNode true
                }
            }
            stages {
                stage('Análisis estático (ruff)') {
                    steps {
                        sh '''
                            python -m venv .venv
                            . .venv/bin/activate
                            pip install --quiet --no-cache-dir -r backend/requirements-dev.txt
                            ruff check backend
                        '''
                    }
                }
                stage('Pruebas unitarias') {
                    steps {
                        sh '''
                            . .venv/bin/activate
                            mkdir -p reportes
                            cd backend
                            python -m pytest -v -p no:cacheprovider --junitxml=../reportes/pruebas-unitarias.xml
                        '''
                    }
                    post {
                        always { junit 'reportes/pruebas-unitarias.xml' }
                    }
                }
            }
        }

        stage('Preparar entorno') {
            steps {
                // Crea el .env que lee docker-compose.yml con las credenciales de Jenkins
                sh 'bash ci/crear-env.sh'
            }
        }

        stage('Build') {
            steps {
                // Construye las imágenes de los DOS servicios de la Entrega 1
                sh '''
                    docker compose build
                    docker tag cronica-historica-frontend:1.0 cronica-historica-frontend:build-${BUILD_NUMBER}
                    docker tag cronica-historica-backend:1.0  cronica-historica-backend:build-${BUILD_NUMBER}
                    docker images "cronica-historica-*"
                '''
            }
        }

        stage('Prueba de humo e integración') {
            steps {
                // Levanta el compose y verifica la comunicación por nombre de servicio (8 verificaciones)
                sh 'bash ci/prueba-integracion.sh'
            }
        }

        stage('Escaneo de seguridad') {
            steps {
                // Trivy: vulnerabilidades HIGH y CRITICAL de las dos imágenes (informativo)
                sh 'bash ci/escaneo-seguridad.sh'
            }
        }
    }

    post {
        always {
            // Resultados de las pruebas de integración en la pestaña "Test Result"
            junit allowEmptyResults: true, testResults: 'reportes/prueba-integracion.xml'
            sh '''
                mkdir -p reportes
                docker compose logs --no-color > reportes/docker-compose.log 2>&1 || true
                docker compose down -v --remove-orphans || true
                rm -f .env
            '''
            archiveArtifacts artifacts: 'reportes/**', allowEmptyArchive: true
        }
        success {
            echo "BUILD EXITOSO #${env.BUILD_NUMBER}: imágenes construidas y pruebas superadas."
        }
        failure {
            echo "BUILD FALLIDO #${env.BUILD_NUMBER}: revise la etapa en rojo y la pestaña Test Result."
        }
        cleanup {
            // Libera espacio: borra imágenes sin uso y la carpeta .venv del workspace
            sh 'docker image prune -f || true'
            sh 'rm -rf .venv || true'
        }
    }
}
