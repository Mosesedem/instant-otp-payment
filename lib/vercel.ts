const VERCEL_API_BASE = "https://api.vercel.com"

interface VercelDomainConfig {
  name: string
  projectId?: string
}

interface VercelDomainResponse {
  name: string
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
}

export class VercelAPI {
  private token: string
  private teamId?: string

  constructor() {
    const token = process.env.VERCEL_API_TOKEN
    if (!token) {
      throw new Error("VERCEL_API_TOKEN environment variable is required")
    }
    this.token = token
    this.teamId = process.env.VERCEL_TEAM_ID
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    }
  }

  private getTeamQuery() {
    return this.teamId ? `?teamId=${this.teamId}` : ""
  }

  /**
   * Add a domain to Vercel
   */
  async addDomain(config: VercelDomainConfig): Promise<VercelDomainResponse> {
    const response = await fetch(`${VERCEL_API_BASE}/v10/projects/${config.projectId}/domains${this.getTeamQuery()}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ name: config.name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to add domain to Vercel")
    }

    return response.json()
  }

  /**
   * Get domain configuration and verification status
   */
  async getDomain(domain: string, projectId: string): Promise<VercelDomainResponse> {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${this.getTeamQuery()}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to get domain from Vercel")
    }

    return response.json()
  }

  /**
   * Verify domain configuration
   */
  async verifyDomain(domain: string, projectId: string): Promise<VercelDomainResponse> {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}/verify${this.getTeamQuery()}`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to verify domain")
    }

    return response.json()
  }

  /**
   * Remove a domain from Vercel
   */
  async removeDomain(domain: string, projectId: string): Promise<void> {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${this.getTeamQuery()}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to remove domain from Vercel")
    }
  }

  /**
   * List all domains for a project
   */
  async listDomains(projectId: string): Promise<VercelDomainResponse[]> {
    const response = await fetch(`${VERCEL_API_BASE}/v9/projects/${projectId}/domains${this.getTeamQuery()}`, {
      method: "GET",
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to list domains")
    }

    const data = await response.json()
    return data.domains || []
  }
}
