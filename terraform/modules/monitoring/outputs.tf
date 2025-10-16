output "grafana_url" {
  value = "http://grafana.${var.namespace}.svc.cluster.local"
}

output "prometheus_url" {
  value = "http://prometheus.${var.namespace}.svc.cluster.local"
}



#need to do sample proetheus-values.yaml and sample grafana-values.yaml