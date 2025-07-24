package services

import (
	"database/sql"
	"fmt"
	"time"

	"backend/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db        *sql.DB
	jwtSecret []byte
}

type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func NewAuthService(db *sql.DB, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

func (s *AuthService) Login(req models.LoginRequest) (*models.LoginResponse, error) {
	// Get user from database
	var user models.User
	query := "SELECT id, username, password_hash, created_at FROM users WHERE username = ?"
	err := s.db.QueryRow(query, req.Username).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid username or password")
		}
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, fmt.Errorf("invalid username or password")
	}

	// Generate JWT token
	token, err := s.GenerateToken(user.ID, user.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %v", err)
	}

	return &models.LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) GenerateToken(userID int, username string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %v", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (s *AuthService) CreateUser(username, password string) (*models.User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	// Insert user
	query := "INSERT INTO users (username, password_hash) VALUES (?, ?)"
	result, err := s.db.Exec(query, username, string(hashedPassword))
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get user ID: %v", err)
	}

	// Get created user
	var user models.User
	query = "SELECT id, username, created_at FROM users WHERE id = ?"
	err = s.db.QueryRow(query, id).Scan(&user.ID, &user.Username, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get created user: %v", err)
	}

	return &user, nil
}

func (s *AuthService) GetUser(id int) (*models.User, error) {
	var user models.User
	query := "SELECT id, username, created_at FROM users WHERE id = ?"
	err := s.db.QueryRow(query, id).Scan(&user.ID, &user.Username, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	return &user, nil
}

func (s *AuthService) UpdatePassword(userID int, oldPassword, newPassword string) error {
	// Get current password hash
	var currentHash string
	query := "SELECT password_hash FROM users WHERE id = ?"
	err := s.db.QueryRow(query, userID).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to get user: %v", err)
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(oldPassword))
	if err != nil {
		return fmt.Errorf("invalid current password")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %v", err)
	}

	// Update password
	query = "UPDATE users SET password_hash = ? WHERE id = ?"
	_, err = s.db.Exec(query, string(hashedPassword), userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %v", err)
	}

	return nil
}
