#include <iostream>
#include <vector>
#include <string>
#include <memory>

namespace math {
    class Calculator {
    private:
        std::vector<double> history;
        static int instanceCount;
        
    public:
        Calculator() {
            instanceCount++;
        }
        
        ~Calculator() {
            instanceCount--;
        }
        
        double add(double a, double b) {
            double result = a + b;
            history.push_back(result);
            return result;
        }
        
        double subtract(double a, double b) {
            double result = a - b;
            history.push_back(result);
            return result;
        }
        
        double multiply(double a, double b) {
            double result = a * b;
            history.push_back(result);
            return result;
        }
        
        double divide(double a, double b) {
            if (b == 0) {
                throw std::invalid_argument("Division by zero");
            }
            double result = a / b;
            history.push_back(result);
            return result;
        }
        
        const std::vector<double>& getHistory() const {
            return history;
        }
        
        static int getInstanceCount() {
            return instanceCount;
        }
    };
    
    int Calculator::instanceCount = 0;
}

namespace utils {
    template<typename T>
    class Logger {
    private:
        std::string prefix;
        std::ostream& output;
        
    public:
        Logger(const std::string& p, std::ostream& out = std::cout) 
            : prefix(p), output(out) {}
        
        void log(const T& message) {
            output << prefix << ": " << message << std::endl;
        }
        
        template<typename U>
        void log(const U& message) {
            output << prefix << ": " << message << std::endl;
        }
    };
}

class Application {
private:
    std::unique_ptr<math::Calculator> calc;
    utils::Logger<std::string> logger;
    
public:
    Application() 
        : calc(std::make_unique<math::Calculator>()),
          logger("App") {
        logger.log("Application initialized");
    }
    
    void run() {
        try {
            double result1 = calc->add(10.5, 5.3);
            logger.log("Addition result: " + std::to_string(result1));
            
            double result2 = calc->multiply(7.2, 3.1);
            logger.log("Multiplication result: " + std::to_string(result2));
            
            double result3 = calc->divide(15.0, 3.0);
            logger.log("Division result: " + std::to_string(result3));
            
            const auto& history = calc->getHistory();
            logger.log("Calculation history size: " + std::to_string(history.size()));
            
        } catch (const std::exception& e) {
            logger.log("Error: " + std::string(e.what()));
        }
    }
    
    ~Application() {
        logger.log("Application shutting down");
    }
};

int main() {
    Application app;
    app.run();
    
    std::cout << "Calculator instances: " << math::Calculator::getInstanceCount() << std::endl;
    
    return 0;
} 