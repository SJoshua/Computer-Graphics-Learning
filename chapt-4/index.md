# Chapt 4
## Practices
### 1.  
$$
R_x = \left[ 
\begin{matrix}
    1 & 0 & 0 & 0 \\
    0 & cos\theta_x & -sin\theta_x & 0 \\
    0 & sin\theta_x &  cos\theta_x & 0 \\
    0 & 0 & 0 & 1
\end{matrix}
\right] 
$$
$$
R_y = \left[ 
\begin{matrix}
     cos\theta_y & 0 & sin\theta_y & 0 \\
    0 & 1 & 0 & 0 \\
    -sin\theta_y & 0 & cos\theta_y & 0 \\
    0 & 0 & 0 & 1
\end{matrix}
\right] 
$$

### 2. 
a. 
$$
S(\beta, \beta, \beta) = \left[ 
\begin{matrix}
    \beta & 0 & 0 & 0 \\
    0 & \beta & 0 & 0 \\
    0 & 0 & \beta & 0 \\
    0 & 0 & 0 & 1
\end{matrix}
\right] 
$$
$$ 
\begin{aligned}
RS(\beta, \beta, \beta) &= \left[ 
\begin{matrix}
    \beta R_{11} & \beta R_{12} & \beta R_{13} & R_{14} \\
    \beta R_{21} & \beta R_{22} & \beta R_{23} & R_{24} \\
    \beta R_{31} & \beta R_{32} & \beta R_{33} & R_{34} \\
    R_{41} & R_{42} & R_{43} & R_{44} 
\end{matrix}
\right] \\
&= S(\beta, \beta, \beta)R
\end{aligned} 
$$

b. 
$$
\begin{aligned}
R_x(\theta_1)R_x(\theta_2) &= \left[ 
\begin{matrix}
    1 & 0 & 0 & 0 \\
    0 & cos\theta_1 cos\theta_2 - sin\theta_1 sin\theta_2 & -sin\theta_1 cos\theta_2 - cos\theta_1 sin\theta_2 & 0 \\
    0 & sin\theta_1 cos\theta_2 + cos\theta_1 sin\theta_2 & cos\theta_1 cos\theta_2 - sin\theta_1 sin\theta_2 & 0\\
    0 & 0 & 0 & 1
\end{matrix}
\right] \\
&= R_x(\theta_2)R_x(\theta_1)
\end{aligned}
$$
* The proof for y/z axis is similar.

c. 
$$
T_1 = \left[ 
\begin{matrix}
    1 & 0 & 0 & \alpha_{x_1} \\
    0 & 1 & 0 & \alpha_{y_1} \\
    0 & 0 & 1 & \alpha_{z_1} \\
    0 & 0 & 0 & 1
\end{matrix}
\right] 
$$

$$
T_2 = \left[ 
\begin{matrix}
    1 & 0 & 0 & \alpha_{x_2} \\
    0 & 1 & 0 & \alpha_{y_2} \\
    0 & 0 & 1 & \alpha_{z_2} \\
    0 & 0 & 0 & 1
\end{matrix}
\right] 
$$

$$
\begin{aligned}
T_1 T_2 &= \left[ 
\begin{matrix}
    1 & 0 & 0 & \alpha_{x_1} + \alpha_{x_2} \\
    0 & 1 & 0 & \alpha_{y_1} + \alpha_{y_2} \\
    0 & 0 & 1 & \alpha_{z_1} + \alpha_{z_2} \\
    0 & 0 & 0 & 1
\end{matrix}
\right] \\
&= T_2 T_1
\end{aligned}
$$

### 3. 
$$
\vec a = \vec u \times \vec v \\
\vec b = \vec u \times \vec a
$$

Now we have an orthogonal coordinate system $(\vec a, \vec b, \vec n)$.
