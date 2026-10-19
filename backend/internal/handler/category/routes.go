// Package category 提供视频分类相关的 HTTP 路由注册。
package category

import (
	categoryrepo "xilixili/backend/internal/repository/category"
	categoryservice "xilixili/backend/internal/service/category"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes 注册分类相关路由到指定的路由组。
// 初始化 repository → service → handler 依赖链。
func RegisterRoutes(r *gin.RouterGroup, db *gorm.DB) {
	repo := categoryrepo.NewRepository(db)
	svc := categoryservice.NewService(repo)
	handler := NewHandler(svc)

	// 分类路由组
	categories := r.Group("/categories")
	{
		categories.GET("/", handler.List)
	}
}
