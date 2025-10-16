output "jenkins_role_arn" {
  value = aws_iam_role.jenkins_role.arn
}

output "ci_cd_role_arn" {
  value = aws_iam_role.ci_cd_role.arn
}