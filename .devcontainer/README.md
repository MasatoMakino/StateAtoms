# .devcontainer

The npm Runner container runs npm in isolation and restricts outbound traffic with an iptables firewall. Git runs on the host, and the container has no Git. For the design rationale, see [DESIGN.md](DESIGN.md).

## Files

| File                | Description                                    |
| ------------------- | ---------------------------------------------- |
| `devcontainer.json` | Container configuration                        |
| `Dockerfile`        | Image (Node.js, firewall)                      |
| `firewall-base.sh`  | iptables firewall logic                        |
| `init-firewall.sh`  | Firewall domain allowlist                      |
| `sample-hooks/`     | Git hooks that run the checks in the container |
