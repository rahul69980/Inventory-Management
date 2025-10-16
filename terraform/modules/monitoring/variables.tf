variable "namespace" {
  description = "Namespace for monitoring stack"
  type        = string
  default     = "monitoring"
}

variable "prometheus_chart_version" {
  description = "Version of Prometheus Helm chart"
  type        = string
  default     = "45.6.0"
}

variable "grafana_chart_version" {
  description = "Version of Grafana Helm chart"
  type        = string
  default     = "6.56.2"
}