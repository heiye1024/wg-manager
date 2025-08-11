package main

import (
	"backend/config"
	"backend/database"
	"backend/routes"
	"backend/services"
	"backend/websocket"
	"github.com/gin-gonic/gin"
	"log"
	"os"
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
