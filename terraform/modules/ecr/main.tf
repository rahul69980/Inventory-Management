resource "aws_ecr_repository" "app_repo" {
  name                 = "${var.project}-repo"
  image_tag_mutability = "IMMUTABLE"
  tags = {
    Name = "${var.project}-ecr"
  }
}

resource "aws_ecr_lifecycle_policy" "app_repo_policy" {
  repository = aws_ecr_repository.app_repo.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Expire untagged images older than 30 days",
        selection    = {
          tagStatus = "untagged",
          countType = "sinceImagePushed",
          countUnit = "days",
          countNumber = 30
        },
        action = {
          type = "expire"
        }
      }
    ]
  })
}