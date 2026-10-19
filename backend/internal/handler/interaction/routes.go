// Package interaction 提供用户交互状态相关的 HTTP 路由注册。
package interaction

import (
	"xilixili/backend/internal/middleware"
	interactionrepo "xilixili/backend/internal/repository/interaction"
	interactionservice "xilixili/backend/internal/service/interaction"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// RegisterRoutes 注册交互状态相关路由到指定的路由组。
// 初始化 repository → service（含 Redis 缓存）→ handler 依赖链。
func RegisterRoutes(r *gin.RouterGroup, db *gorm.DB, rdb *redis.Client) {
	repo := interactionrepo.NewRepository(db)
	svc := interactionservice.NewService(repo, rdb)
	handler := NewHandler(svc)

	// 聚合交互状态查询：需要认证
	r.GET("/videos/:id/interactions", middleware.AuthRequired(), handler.GetVideoInteractions)
}
