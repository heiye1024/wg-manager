package main

import (
	"backend/config"
	"backend/database"
	"backend/routes"
	"backend/services"
	"backend/websocket"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"log"
	"os"
	"time"
)

func main() {

	// Load configuration
	cfg := config.Load()

	// 初始化数据库
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// 创建路由器
	router := gin.Default()
	// ① 全局 CORS（一定要在注册路由前 Use）
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // 允许所有域名访问
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true, // 如不带 cookie 可设为 false

		MaxAge: 12 * time.Hour,
	}))

	// Initialize services
	authService := services.NewAuthService(db, cfg.JWTSecret)
	wgService := services.NewWireGuardService(db)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// 设置路由
	routes.SetupRoutes(router, authService, wgService, hub)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务器

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}

}
