FROM mcr.microsoft.com/devcontainers/javascript-node:22

USER root

# ボリュームマウントポイントを事前作成し、node所有に設定
RUN mkdir -p /workspaces/StateAtoms/node_modules && \
    chown -R node:node /workspaces/StateAtoms

USER node