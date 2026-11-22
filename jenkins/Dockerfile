# =========================================================
# Imagen de Jenkins para el proyecto Crónica Histórica
# Base oficial: jenkins/jenkins:lts-jdk21
# + cliente de Docker y plugin "docker compose" (para que el
#   pipeline construya y pruebe los contenedores)
# + plugins: Git/GitHub, Pipeline, Docker Pipeline, JCasC...
# + Configuration as Code (jenkins.yaml): sin asistente de instalación
# =========================================================
FROM jenkins/jenkins:lts-jdk21

USER root

# Cliente de Docker y Docker Compose (repositorio oficial de Docker para Debian)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Jenkins vuelve a ejecutarse con su usuario sin privilegios
USER jenkins

# Plugins requeridos (Git/GitHub, Pipeline, Docker Pipeline, ...)
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Configuración como código (JCasC): usuario, credenciales y ajustes generales
COPY --chown=jenkins:jenkins jenkins.yaml /usr/share/jenkins/casc/jenkins.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/jenkins.yaml
